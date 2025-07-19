import { useState, useEffect } from 'react';
import { Calendar, Upload, Search as SearchIcon, X, Check } from 'lucide-react';
import { useRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Loader2, Plus, User, LogOut, Settings, SunIcon, MoonIcon } from 'lucide-react';
import { useTheme } from '../ThemeProvider';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4001/api';

// For now we'll use a hardcoded userId, but in a real app this would come from auth context/redux
let userId;

interface AttendanceRequest {
  _id: string;
  name: string;
  reason: string;
  proof?: string;
  subject_dates: SubjectDate[];
  student_id: Student;
  status: 'pending' | 'approved' | 'rejected';
  start_date: string;
  end_date: string;
  createdAt: string;
  updatedAt: string;
  feedbackNote?: string;
}

interface Subject {
  _id: string;
  name: string;
  start_time: string;
  end_time: string;
  day: string;
  class_name: string;
  teacher_id: {
    _id: string;
    name: string;
  };
}

interface Student {
  _id: string;
  name: string;
  sap: string;
  email: string;
  className: string;
}

interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function StudentDashboard() {
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AttendanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<RequestStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRequestForm, setCreateRequestForm] = useState({
    name: '',
    reason: '',
    subject_ids: [],
    student_ids: []
  });
  const [proofFile, setProofFile] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [calendarView, setCalendarView] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<AttendanceRequest | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    reason: '',
    subject_ids: [],
    student_ids: []
  });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    className: '',
    password: '',
    confirmPassword: ''
  });
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [requestDate, setRequestDate] = useState(new Date());
  const [isDateRange, setIsDateRange] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const { theme, toggleTheme, setTheme } = useTheme();
 
  // Calculate minimum and maximum allowed dates (today to 7 days from now)
  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(minDate.getDate() + 7);

  // Helper function to validate if date is within allowed range
  const isDateWithinRange = (date) => {
    return date >= minDate && date <= maxDate;
  };

  // Add a helper function to validate date range
  const isDateRangeValid = () => {
    if (!isDateRange || !endDate) return true;
    return endDate <= maxDate && endDate >= requestDate;
  };

  // Helper to get a date object for a specific day of the week
  const getDateForDayOfWeek = (dayName, startDate, endDate = null) => {
    const dayMap = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 0
    };
   
    const targetDay = dayMap[dayName];
   
    if (targetDay === undefined) {
      console.error(`Invalid day name: ${dayName}`);
      return null;
    }
   
    // If no date range, just use the provided date
    if (!endDate) {
      return new Date(startDate);
    }
   
    // Find the next occurrence of this day within the date range
    const date = new Date(startDate);
    const end = new Date(endDate);
   
    while (date <= end) {
      if (date.getDay() === targetDay) {
        return new Date(date);
      }
      date.setDate(date.getDate() + 1);
    }
   
    // If we couldn't find a matching day in the range, return null
    return null;
  };

  // Add this function after the getDateForDayOfWeek function
  const getFilteredSubjects = (subjects, startDate, endDate) => {
    if (!subjects || !startDate) return [];
   
    const dayMap = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 0
    };

    return subjects.filter(subject => {
      const subjectDay = dayMap[subject.day];
      if (subjectDay === undefined) return false;

      // If no end date, just check if the subject's day matches the start date
      if (!endDate) {
        return startDate.getDay() === subjectDay;
      }

      // For date range, check if the subject's day falls within the range
      const currentDate = new Date(startDate);
      const end = new Date(endDate);
     
      while (currentDate <= end) {
        if (currentDate.getDay() === subjectDay) {
          return true;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
     
      return false;
    });
  };

  // Fetch attendance requests
  useEffect(() => {
    userId = JSON.parse(localStorage.getItem('user') || '{}')._id;
    console.log(userId);
   
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/attendance-requests/student/${userId}`);
        console.log('API Response:', res.data);
       
        // Ensure res.data is an array
        const responseData = Array.isArray(res.data) ? res.data : [];
       
        setRequests(responseData);
        setFilteredRequests(responseData);
      } catch (error: any) {
        console.error('Error fetching requests:', error);
        setError(error?.response?.data?.message || 'Error fetching requests');
      } finally {
        setLoading(false);
      }
    };

    const fetchStats = async () => {
      try {
        // Try to fetch real data
        const res = await axios.get(`${API_BASE_URL}/attendance-requests/stats/${userId}`);
        setStats(res.data);
        console.log("Stats:", res.data);
       
      } catch (error: any) {
        console.error('Error fetching stats:', error);
       
        // Use dummy stats data temporarily until backend is ready
        setStats({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        });
      }
    };

    fetchRequests();
    fetchStats();
  }, []);

  // Filter requests when search term or status filter changes
  useEffect(() => {
    let filtered = [...requests];
   
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(req =>
        req.name.toLowerCase().includes(search) ||
        req.reason.toLowerCase().includes(search) ||
        req.subject_dates.some(sub => sub.subject_id.name.toLowerCase().includes(search))
      );
    }
   
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }
   
    setFilteredRequests(filtered);
  }, [searchTerm, statusFilter, requests]);

  // Handle logout
  const handleLogout = () => {
    // In a real app, this would dispatch logout action
    localStorage.removeItem('user');
    window.location.reload();
    console.log('Logging out...');
  };

  // Open the request detail modal
  const openRequestModal = (request: AttendanceRequest) => {
    setSelectedRequest(request);
    setIsRequestModalOpen(true);
  };

  // Add a function to fetch subjects for the calendar view
  const fetchAvailableSubjects = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/subjects`);
      // Get student's class from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const studentClass = user.className;
     
      // Filter subjects to only show those matching the student's class
      const filteredSubjects = res.data.filter(subject => subject.class_name === studentClass);
     
      setAvailableSubjects(filteredSubjects || []);
      console.log("Available subjects for class", studentClass, ":", filteredSubjects);
     
    } catch (error) {
      console.error('Error fetching subjects:', error);
      // Fallback to empty array if API fails
      setAvailableSubjects([]);
    }
  };

  // Add a function to search for students
  const searchStudents = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/users/search?query=${query}`);
      setSearchResults(res.data.filter(user => user.role === 'student'));
    } catch (error) {
      console.error('Error searching students:', error);
      setSearchResults([]);
    }
  };

  // Add a function to file upload
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  // Add a function to handle subject selection in calendar view
  const toggleSubjectSelection = (subject) => {
    // Get the appropriate ID, supporting both _id and id fields
    const subjectId = subject._id || subject.id;
   
    if (!subjectId) {
      console.error('Subject missing ID:', subject);
      return;
    }
   
    // Check if this subject is already selected
    const isSelected = selectedSubjects.some(s =>
      (s._id || s.id) === subjectId
    );
   
    if (isSelected) {
      // If already selected, remove it
      setSelectedSubjects(selectedSubjects.filter(s =>
        (s._id || s.id) !== subjectId
      ));
    } else {
      // If not selected, add it
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  // Add a function to toggle student selection
  const toggleStudentSelection = (student) => {
    if (selectedStudents.some(s => s._id === student._id)) {
      setSelectedStudents(selectedStudents.filter(s => s._id !== student._id));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  // Add a function to create the attendance request
  const createAttendanceRequest = async () => {
    if (!createRequestForm.name || !createRequestForm.reason || selectedSubjects.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    if (!isDateWithinRange(requestDate)) {
      alert('Please select a date within the next 7 days');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', createRequestForm.name);
      formData.append('reason', createRequestForm.reason);
      formData.append('student_id', userId); // Current user
     
      // Add the request date
      formData.append('date', requestDate.toISOString());
     
      // Add selected students
      selectedStudents.forEach(student => {
        const studentId = student._id || student.id;
        if (studentId) {
          formData.append('student_ids', studentId);
        }
      });
     
      // Add selected subjects with their specific dates
      selectedSubjects.forEach(subject => {
        const subjectId = subject._id || subject.id;
        if (subjectId) {
          // Add subject ID to the subject_ids array (still needed by backend)
          formData.append('subject_ids', subjectId);
         
          // Calculate the actual date for this subject based on its day of week
          const subjectDate = getDateForDayOfWeek(subject.day, requestDate);
         
          if (subjectDate) {
            // Store the date for this specific subject
            formData.append(`subject_dates[${subjectId}]`, subjectDate.toISOString());
          }
        } else {
          console.error('Subject missing ID:', subject);
        }
      });
     
      // Add proof file if available
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      const res = await axios.post(`${API_BASE_URL}/attendance-requests`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Reset form and close modal
      setCreateRequestForm({
        name: '',
        reason: '',
        subject_ids: [],
        student_ids: []
      });
      setProofFile(null);
      setSelectedStudents([]);
      setSelectedSubjects([]);
      setRequestDate(new Date());
      setIsCreateModalOpen(false);
     
      // Refresh attendance requests
      window.location.reload();
     
    } catch (error) {
      console.error('Error creating attendance request:', error);
     
      if (error.response && error.response.data && error.response.data.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert('Error creating attendance request. Please try again.');
      }
    }
  };

  // Add this function to handle opening the edit modal
  const openEditModal = (request: AttendanceRequest) => {
    setEditingRequest(request);
    setEditForm({
      name: request.name,
      reason: request.reason,
      subject_ids: request.subject_dates.map(sd => sd.subject_id),
      student_ids: request.student_ids.map(s => s._id)
    });
   
    // Set the selected subjects and students based on the request
    setSelectedSubjects(request.subject_dates.map(sd => sd.subject_id));
    setSelectedStudents(request.student_ids);
   
    // Set the date from the request, or default to today if not available
    setRequestDate(request.start_date ? new Date(request.start_date) : new Date());
   
    // Close the detail modal if it's open
    setIsRequestModalOpen(false);
   
    // Fetch subjects for selection
    fetchAvailableSubjects();
   
    // Open the edit modal
    setIsEditModalOpen(true);
  };

  // Add this function to handle the update
  const updateAttendanceRequest = async () => {
    if (!editingRequest || !editForm.name || !editForm.reason || selectedSubjects.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    if (!isDateWithinRange(requestDate)) {
      alert('Please select a date within the next 7 days');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('reason', editForm.reason);
      formData.append('date', requestDate.toISOString());
     
      // If using date range, add end date
      if (isDateRange && endDate) {
        formData.append('end_date', endDate.toISOString());
      }
     
      // Add selected subjects with date information
      selectedSubjects.forEach(subject => {
        const subjectId = subject._id || subject.id;
        if (subjectId) {
          formData.append('subject_ids', subjectId);
         
          // Calculate the actual date for this subject based on its day of week
          const subjectDate = getDateForDayOfWeek(
            subject.day,
            requestDate,
            isDateRange ? endDate : null
          );
         
          if (subjectDate) {
            // Also append the specific date for this subject
            formData.append(`subject_dates[${subjectId}]`, subjectDate.toISOString());
          }
        } else {
          console.error('Subject missing ID:', subject);
        }
      });
     
      // Add selected students
      selectedStudents.forEach(student => {
        const studentId = student._id || student.id;
        if (studentId) {
          formData.append('student_ids', studentId);
        }
      });
     
      // Add proof file if a new one was uploaded
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      const res = await axios.put(`${API_BASE_URL}/attendance-requests/${editingRequest._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Reset form and close modal
      setEditForm({
        name: '',
        reason: '',
        subject_ids: [],
        student_ids: []
      });
      setProofFile(null);
      setSelectedStudents([]);
      setSelectedSubjects([]);
      setRequestDate(new Date());
      setIsEditModalOpen(false);
      setEditingRequest(null);
     
      // Refresh attendance requests
      window.location.reload();
     
    } catch (error) {
      console.error('Error updating attendance request:', error);
     
      if (error.response && error.response.data && error.response.data.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert('Error updating attendance request. Please try again.');
      }
    }
  };

  // Add this function to handle the delete operation
  const deleteAttendanceRequest = async (requestId: string) => {
    // Confirm deletion with the user
    if (!window.confirm('Are you sure you want to delete this attendance request? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/attendance-requests/${requestId}`);
     
      // Close the detail modal if it's open
      setIsRequestModalOpen(false);
     
      // Refresh the requests list
      setRequests(requests.filter(req => req._id !== requestId));
      setFilteredRequests(filteredRequests.filter(req => req._id !== requestId));
     
      // Update stats
      if (selectedRequest) {
        const newStats = { ...stats };
        newStats.total -= 1;
       
        if (selectedRequest.status === 'pending') {
          newStats.pending -= 1;
        } else if (selectedRequest.status === 'approved') {
          newStats.approved -= 1;
        } else if (selectedRequest.status === 'rejected') {
          newStats.rejected -= 1;
        }
       
        setStats(newStats);
      }
     
      // Reset the selected request
      setSelectedRequest(null);
     
    } catch (error: any) {
      console.error('Error deleting attendance request:', error);
     
      // Show error message to user
      let errorMessage = 'Failed to delete the attendance request.';
     
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        if (error.response.status === 403) {
          errorMessage = 'You can only delete pending requests or you do not have permission to delete this request.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
     
      alert(errorMessage);
    }
  };

  // Add this function to handle delete confirmation
  const openDeleteConfirm = (requestId: string) => {
    setRequestToDelete(requestId);
    setIsDeleteConfirmOpen(true);
  };

  // Add this function to handle delete confirmation
  const confirmDelete = async () => {
    if (!requestToDelete) return;
   
    try {
      await axios.delete(`${API_BASE_URL}/attendance-requests/${requestToDelete}`);
     
      // Close modals
      setIsDeleteConfirmOpen(false);
      setIsRequestModalOpen(false);
     
      // Refresh the requests list
      setRequests(requests.filter(req => req._id !== requestToDelete));
      setFilteredRequests(filteredRequests.filter(req => req._id !== requestToDelete));
     
      // Update stats
      const deletedRequest = requests.find(req => req._id === requestToDelete);
      if (deletedRequest) {
        const newStats = { ...stats };
        newStats.total -= 1;
       
        if (deletedRequest.status === 'pending') {
          newStats.pending -= 1;
        } else if (deletedRequest.status === 'approved') {
          newStats.approved -= 1;
        } else if (deletedRequest.status === 'rejected') {
          newStats.rejected -= 1;
        }
       
        setStats(newStats);
      }
     
      // Reset the selected request and delete state
      setSelectedRequest(null);
      setRequestToDelete(null);
     
    } catch (error: any) {
      console.error('Error deleting attendance request:', error);
     
      // Show error message
      let errorMessage = 'Failed to delete the attendance request.';
     
      if (error.response) {
        if (error.response.status === 403) {
          errorMessage = 'You can only delete pending requests or you do not have permission to delete this request.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
     
      alert(errorMessage);
     
      // Close delete confirmation
      setIsDeleteConfirmOpen(false);
      setRequestToDelete(null);
    }
  };

  // Add this useEffect to fetch the current user data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/users/${userId}`);
        setUserProfile({
          name: res.data.name || '',
          email: res.data.email || '',
          className: res.data.className || '',
          password: '',
          confirmPassword: ''
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (isUserModalOpen) {
      fetchUserProfile();
    }
  }, [isUserModalOpen, userId]);

  // Add this function to update user profile
  const updateUserProfile = async () => {
    try {
      setUpdateError('');
      setUpdateSuccess(false);
     
      // Validate password fields if provided
      if (userProfile.password && userProfile.password !== userProfile.confirmPassword) {
        setUpdateError('Passwords do not match');
        return;
      }
     
      const userData = {
        name: userProfile.name,
        email: userProfile.email,
        className: userProfile.className
      };
     
      // Only include password if it was changed
      if (userProfile.password) {
        userData.password = userProfile.password;
      }
     
      const res = await axios.put(`${API_BASE_URL}/users/${userId}`, userData);
     
      setUpdateSuccess(true);
     
      // Reset password fields
      setUserProfile({
        ...userProfile,
        password: '',
        confirmPassword: ''
      });
     
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
     
    } catch (error) {
      console.error('Error updating user profile:', error);
      setUpdateError(error?.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Navbar */}
      <header className="bg-white dark:bg-gray-800 shadow transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Student Dashboard</h1>
         
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarImage src="/default-avatar.png" />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border dark:border-gray-700">
              <DropdownMenuLabel className='text-gray-900 dark:text-gray-100'>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsUserModalOpen(true)}>
                 <Settings className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100 " />
                <span className='text-gray-900 dark:text-gray-100'>Settings</span>
              </DropdownMenuItem>
              {/* <DropdownMenuItem onClick={toggleTheme}>
                {theme === 'dark' ? (
                  <>
                    <SunIcon className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100 " />
                    <span className='text-gray-900 dark:text-gray-100'>Switch to Light Mode</span>
                  </>
                ) : (
                  <>
                    <MoonIcon className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100" />
                    <span className='text-gray-900 dark:text-gray-100'>Switch to Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100" />
                 <span className='text-gray-900 dark:text-gray-100'>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200 shadow-sm hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-800 dark:text-gray-200">Total Requests</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-800 dark:text-gray-200">
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
         
          <Card className="border dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            </CardContent>
          </Card>
         
          <Card className="border dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
            </CardContent>
          </Card>
         
          <Card className="border dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>
       
        {/* Search & Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              className="pl-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
         
          <div className="flex gap-4 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-white dark:bg-gray-800 border dark:border-gray-700">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border dark:border-gray-700">
                <SelectItem value="all" className='text-gray-900 dark:text-gray-100'>All Status</SelectItem>
                <SelectItem value="pending" className='text-gray-900 dark:text-gray-100'>Pending</SelectItem>
                <SelectItem value="approved" className='text-gray-900 dark:text-gray-100'>Approved</SelectItem>
                <SelectItem value="rejected" className='text-gray-900 dark:text-gray-100'>Rejected</SelectItem>
              </SelectContent>
            </Select>
           
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
              onClick={() => {
                setIsCreateModalOpen(true);
                fetchAvailableSubjects(); // Fetch subjects when opening modal
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </div>
        </div>
       
        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : !Array.isArray(filteredRequests) || filteredRequests.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No attendance requests found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((request) => (
              <Card
                key={request._id}
                className="cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 shadow-sm hover:shadow-md transition-all duration-200"
                onClick={() => openRequestModal(request)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium">{request.name}</CardTitle>
                    <Badge
                      variant={
                        request.status === 'approved' ? 'default' :
                         request.status.trim().toLowerCase() === 'rejected' ? 'default':'default'
                      }
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1 text-gray-800 dark:text-gray-200">Subjects:</div>
                    <div className="space-y-1">
                      {request.subject_dates.slice(0, 2).map((sd) => (
                        <div key={sd.subject_id._id} className="text-gray-600 dark:text-gray-400">
                          {sd.subject_id.name} ({sd.subject_id.day}, {sd.subject_id.start_time}-{sd.subject_id.end_time})
                        </div>
                      ))}
                      {request.subject_dates.length > 2 && (
                        <div className="text-gray-600 dark:text-gray-400">
                          + {request.subject_dates.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                    {request.reason}
                  </p>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* User Settings Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-50">User Settings</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Update your profile settings and preferences.
            </DialogDescription>
          </DialogHeader>
         
          <div className="space-y-4 py-4">
            {/* User info form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <Input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
             
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <Input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
             
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                <Input
                  type="text"
                  value={userProfile.className}
                  onChange={(e) => setUserProfile({...userProfile, className: e.target.value})}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
             
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <Input
                  type="password"
                  value={userProfile.password}
                  onChange={(e) => setUserProfile({...userProfile, password: e.target.value})}
                  placeholder="Leave blank to keep current password"
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
             
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                <Input
                  type="password"
                  value={userProfile.confirmPassword}
                  onChange={(e) => setUserProfile({...userProfile, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

           
            {/* Success/Error messages */}
            {updateSuccess && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-2 rounded-md">
                Profile updated successfully!
              </div>
            )}
           
            {updateError && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded-md">
                {updateError}
              </div>
            )}

            <div className="flex justify-end items-center pt-2">
             
             
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={updateUserProfile}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Detail Modal */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle>{selectedRequest.name}</DialogTitle>
                  <Badge
                    variant={
                      selectedRequest.status === 'approved' ? 'default' :
                      selectedRequest.status === 'rejected' ? 'destructive' : 'outline'
                    }
                  >
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </Badge>
                </div>
                <DialogDescription>
                  Created on {new Date(selectedRequest.createdAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-1 text-gray-800 dark:text-gray-200">Reason</h4>
                  <p>{selectedRequest.reason}</p>
                </div>

                {/* Add this block to display feedback */}
                {selectedRequest.status !== 'pending' && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 text-gray-800 dark:text-gray-200">
                      {selectedRequest.status === 'approved' ? 'Approval' : 'Rejection'} Remarks
                    </h4>
                    <p className="p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md">
                      {selectedRequest.feedbackNote || 'No feedback provided'}
                    </p>
                  </div>
                )}

                {selectedRequest.proof && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Supporting Document</h4>
                    <a
                      href={selectedRequest.proof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View Document
                    </a>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm mb-1">Subjects</h4>
                  <div className="space-y-2">
                    {selectedRequest.subject_dates.map((sd) => (
                      <div
                        key={sd.subject_id._id}
                        className="p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-50">{sd.subject_id.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {sd.subject_id.day}, {sd.subject_id.start_time}-{sd.subject_id.end_time}, Class: {sd.subject_id.class_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Teacher: {sd.subject_id.teacher_id?.name || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => {
                    if (selectedRequest) {
                      openEditModal(selectedRequest);
                    }
                  }}
                  disabled={selectedRequest && selectedRequest.status !== 'pending'}
                >
                  Edit Request
                </Button>
                <Button
                  variant="destructive"
                  className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
                  onClick={() => {
                    if (selectedRequest) {
                      openDeleteConfirm(selectedRequest._id);
                    }
                  }}
                  disabled={selectedRequest && selectedRequest.status !== 'pending'}
                >
                  Delete Request
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">Create Attendance Request</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Request name & reason */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Name*</label>
                  <input
                    type="text"
                    value={createRequestForm.name}
                    onChange={(e) => setCreateRequestForm({...createRequestForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g. Medical Leave"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Request*</label>
                  <textarea
                    value={createRequestForm.reason}
                    onChange={(e) => setCreateRequestForm({...createRequestForm, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-24"
                    placeholder="Describe your reason..."
                    required
                  />
                </div>
              </div>

              {/* Date selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date for Absence*</label>
                <div className="flex items-center mb-2">
                  <div className="flex items-center mr-4">
                    <input
                      type="checkbox"
                      id="dateRange"
                      checked={isDateRange}
                      onChange={(e) => {
                        setIsDateRange(e.target.checked);
                        if (!e.target.checked) {
                          setEndDate(null);
                        } else if (!endDate) {
                          // Set default end date to next day
                          const nextDay = new Date(requestDate);
                          nextDay.setDate(nextDay.getDate() + 1);
                          if (nextDay <= maxDate) {
                            setEndDate(nextDay);
                          } else {
                            setEndDate(maxDate);
                          }
                        }
                      }}
                      className="h-4 w-4 mr-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="dateRange" className="text-sm text-gray-700 dark:text-gray-300">
                      Select date range
                    </label>
                  </div>
                </div>
               
                <div className={`${isDateRange ? 'grid grid-cols-2 gap-4' : ''}`}>
                  <div className="relative">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {isDateRange ? 'Start Date' : 'Date'}
                    </label>
                    <DatePicker
                      selected={requestDate}
                      onChange={(date) => setRequestDate(date)}
                      minDate={minDate}
                      maxDate={maxDate}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholderText="Select date"
                      dateFormat="MMMM d, yyyy"
                      highlightDates={[requestDate]}
                      required
                    />
                    {!isDateWithinRange(requestDate) && (
                      <p className="text-xs text-red-500 mt-1">
                        Date must be within the allowed range
                      </p>
                    )}
                  </div>
                 
                  {isDateRange && (
                    <div className="relative">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        End Date
                      </label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        minDate={requestDate}
                        maxDate={maxDate}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholderText="Select end date"
                        dateFormat="MMMM d, yyyy"
                        highlightDates={[endDate]}
                        required={isDateRange}
                      />
                      {endDate && !isDateRangeValid() && (
                        <p className="text-xs text-red-500 mt-1">
                          End date must be within the allowed range and after start date
                        </p>
                      )}
                    </div>
                  )}
                </div>
               
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You can request attendance for today up to 7 days from now
                  {isDateRange && ". Select a range for consecutive days."}
                </p>
              </div>

              {/* Upload proof */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supporting Document</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  {!proofFile ? (
                    <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Click to upload a PDF or image
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        PDF, PNG, JPG up to 5MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded flex items-center">
                        <Check className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm text-gray-800 dark:text-gray-200">{proofFile.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProofFile(null);
                          }}
                          className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Subjects*</label>
                  <button
                    onClick={() => setCalendarView(!calendarView)}
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    {calendarView ? "List View" : "Calendar View"}
                  </button>
                </div>

                {/* Calendar View */}
                {calendarView ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
                      <div className="grid grid-cols-6 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                          <div key={day} className="text-center font-medium text-sm text-gray-700 dark:text-gray-300">
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>
                   
                    <div className="p-4">
                      <div className="grid grid-cols-6 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                          const filteredSubjects = getFilteredSubjects(
                            availableSubjects.filter(subject => subject.day === day),
                            requestDate,
                            isDateRange ? endDate : null
                          );
                         
                          return (
                            <div key={day} className="min-h-[200px] border border-gray-200 dark:border-gray-700 rounded p-2">
                              {filteredSubjects.map(subject => {
                                const isSelected = selectedSubjects.some(s => (s.id || s._id) === (subject.id || subject._id));
                                return (
                                  <div
                                    key={subject.id || subject._id}
                                    onClick={() => toggleSubjectSelection(subject)}
                                    className={`
                                      mb-2 p-2 rounded text-xs cursor-pointer transition-colors
                                      ${isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}
                                    `}
                                  >
                                    <div className="font-medium">{subject.name}</div>
                                    <div className="text-xs opacity-90">{subject.start_time} - {subject.end_time}</div>
                                    <div className="text-xs">{subject.teacher_name || 'No teacher'}</div>
                                  </div>
                                );
                              })}
                              {filteredSubjects.length === 0 && (
                                <div className="text-center text-gray-500 dark:text-gray-400 text-xs py-4">
                                  No lectures
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    {(() => {
                      const filteredSubjects = getFilteredSubjects(availableSubjects, requestDate, isDateRange ? endDate : null);
                      return filteredSubjects.length > 0 ? (
                        filteredSubjects.map(subject => {
                          const isSelected = selectedSubjects.some(s => (s.id || s._id) === (subject.id || subject._id));
                          return (
                            <div
                              key={subject.id || subject._id}
                              onClick={() => toggleSubjectSelection(subject)}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors
                                ${isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                              <div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{subject.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {subject.day}, {subject.start_time} - {subject.end_time}
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-full border flex items-center justify-center
                                ${isSelected
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300 dark:border-gray-600'}`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No lectures available for selected date(s)
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Other Students (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      searchStudents(e.target.value);
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Search students by name or SAP ID"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                    <ul className="max-h-40 overflow-y-auto">
                      {searchResults.map(student => (
                        <li
                          key={student._id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between"
                          onClick={() => toggleStudentSelection(student)}
                        >
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{student.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{student.sap} - {student.className || 'No class'}</div>
                          </div>
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center
                            ${selectedStudents.some(s => s._id === student._id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 dark:border-gray-600'}`}
                          >
                            {selectedStudents.some(s => s._id === student._id) &&
                              <Check className="h-3 w-3 text-white" />}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Selected Students */}
                {selectedStudents.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Selected Students</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudents.map(student => (
                        <div
                          key={student._id}
                          className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center"
                        >
                          {student.name}
                          <button
                            onClick={() => toggleStudentSelection(student)}
                            className="ml-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createAttendanceRequest}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition
                    ${(!createRequestForm.name || !createRequestForm.reason || selectedSubjects.length === 0)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''}`}
                  disabled={!createRequestForm.name || !createRequestForm.reason || selectedSubjects.length === 0}
                >
                  Create Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {isEditModalOpen && editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">Edit Attendance Request</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Request name & reason */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Name*</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g. Medical Leave"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Request*</label>
                  <textarea
                    value={editForm.reason}
                    onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-24"
                    placeholder="Describe your reason..."
                    required
                  />
                </div>
              </div>

              {/* Date selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date for Absence*</label>
                <div className="flex items-center mb-2">
                  <div className="flex items-center mr-4">
                    <input
                      type="checkbox"
                      id="dateRange"
                      checked={isDateRange}
                      onChange={(e) => {
                        setIsDateRange(e.target.checked);
                        if (!e.target.checked) {
                          setEndDate(null);
                        } else if (!endDate) {
                          // Set default end date to next day
                          const nextDay = new Date(requestDate);
                          nextDay.setDate(nextDay.getDate() + 1);
                          if (nextDay <= maxDate) {
                            setEndDate(nextDay);
                          } else {
                            setEndDate(maxDate);
                          }
                        }
                      }}
                      className="h-4 w-4 mr-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="dateRange" className="text-sm text-gray-700 dark:text-gray-300">
                      Select date range
                    </label>
                  </div>
                </div>
               
                <div className={`${isDateRange ? 'grid grid-cols-2 gap-4' : ''}`}>
                  <div className="relative">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {isDateRange ? 'Start Date' : 'Date'}
                    </label>
                    <DatePicker
                      selected={requestDate}
                      onChange={(date) => setRequestDate(date)}
                      minDate={minDate}
                      maxDate={maxDate}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholderText="Select date"
                      dateFormat="MMMM d, yyyy"
                      highlightDates={[requestDate]}
                      required
                    />
                    {!isDateWithinRange(requestDate) && (
                      <p className="text-xs text-red-500 mt-1">
                        Date must be within the allowed range
                      </p>
                    )}
                  </div>
                 
                  {isDateRange && (
                    <div className="relative">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        End Date
                      </label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        minDate={requestDate}
                        maxDate={maxDate}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholderText="Select end date"
                        dateFormat="MMMM d, yyyy"
                        highlightDates={[endDate]}
                        required={isDateRange}
                      />
                      {endDate && !isDateRangeValid() && (
                        <p className="text-xs text-red-500 mt-1">
                          End date must be within the allowed range and after start date
                        </p>
                      )}
                    </div>
                  )}
                </div>
               
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You can request attendance for today up to 7 days from now
                  {isDateRange && ". Select a range for consecutive days."}
                </p>
              </div>

              {/* Upload proof */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supporting Document</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  {!proofFile ? (
                    <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                      {editingRequest.proof ? (
                        <div className="flex flex-col items-center">
                          <Check className="h-12 w-12 text-green-500" />
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Document already uploaded. Click to replace.
                          </p>
                          <a
                            href={editingRequest.proof}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 text-blue-500 hover:underline text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View current document
                          </a>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Click to upload a PDF or image
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            PDF, PNG, JPG up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded flex items-center">
                        <Check className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm text-gray-800 dark:text-gray-200">{proofFile.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProofFile(null);
                          }}
                          className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Selection - Same UI as create modal */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Subjects*</label>
                  <button
                    onClick={() => setCalendarView(!calendarView)}
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    {calendarView ? "List View" : "Calendar View"}
                  </button>
                </div>

                {/* Calendar View */}
                {calendarView ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
                      <div className="grid grid-cols-6 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                          <div key={day} className="text-center font-medium text-sm text-gray-700 dark:text-gray-300">
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>
                   
                    <div className="p-4">
                      <div className="grid grid-cols-6 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                          const filteredSubjects = getFilteredSubjects(
                            availableSubjects.filter(subject => subject.day === day),
                            requestDate,
                            isDateRange ? endDate : null
                          );
                         
                          return (
                            <div key={day} className="min-h-[200px] border border-gray-200 dark:border-gray-700 rounded p-2">
                              {filteredSubjects.map(subject => {
                                const isSelected = selectedSubjects.some(s => (s.id || s._id) === (subject.id || subject._id));
                                return (
                                  <div
                                    key={subject.id || subject._id}
                                    onClick={() => toggleSubjectSelection(subject)}
                                    className={`
                                      mb-2 p-2 rounded text-xs cursor-pointer transition-colors
                                      ${isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}
                                    `}
                                  >
                                    <div className="font-medium">{subject.name}</div>
                                    <div className="text-xs opacity-90">{subject.start_time} - {subject.end_time}</div>
                                    <div className="text-xs">{subject.teacher_name || 'No teacher'}</div>
                                  </div>
                                );
                              })}
                              {filteredSubjects.length === 0 && (
                                <div className="text-center text-gray-500 dark:text-gray-400 text-xs py-4">
                                  No lectures
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    {(() => {
                      const filteredSubjects = getFilteredSubjects(availableSubjects, requestDate, isDateRange ? endDate : null);
                      return filteredSubjects.length > 0 ? (
                        filteredSubjects.map(subject => {
                          const isSelected = selectedSubjects.some(s => (s.id || s._id) === (subject.id || subject._id));
                          return (
                            <div
                              key={subject.id || subject._id}
                              onClick={() => toggleSubjectSelection(subject)}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors
                                ${isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                              <div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{subject.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {subject.day}, {subject.start_time} - {subject.end_time}
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-full border flex items-center justify-center
                                ${isSelected
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300 dark:border-gray-600'}`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No lectures available for selected date(s)
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Other Students (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      searchStudents(e.target.value);
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Search students by name or SAP ID"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                    <ul className="max-h-40 overflow-y-auto">
                      {searchResults.map(student => (
                        <li
                          key={student._id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between"
                          onClick={() => toggleStudentSelection(student)}
                        >
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{student.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{student.sap} - {student.className || 'No class'}</div>
                          </div>
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center
                            ${selectedStudents.some(s => s._id === student._id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 dark:border-gray-600'}`}
                          >
                            {selectedStudents.some(s => s._id === student._id) &&
                              <Check className="h-3 w-3 text-white" />}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Selected Students */}
                {selectedStudents.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Selected Students</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudents.map(student => (
                        <div
                          key={student._id}
                          className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center"
                        >
                          {student.name}
                          <button
                            onClick={() => toggleStudentSelection(student)}
                            className="ml-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={updateAttendanceRequest}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition
                    ${(!editForm.name || !editForm.reason || selectedSubjects.length === 0)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''}`}
                  disabled={!editForm.name || !editForm.reason || selectedSubjects.length === 0}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
              Are you sure you want to delete this attendance request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
         
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}