import { useState, useEffect } from 'react';
import { useRef } from 'react';
import axios from 'axios';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, User, LogOut, Settings, SunIcon, MoonIcon, Search as SearchIcon, Filter, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useTheme } from '../ThemeProvider';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

const API_BASE_URL = 'http://localhost:4001/api';

interface UserData {
  _id: string;
  name: string;
  email: string;
  className: string;
}

interface UserProfile {
  name: string;
  email: string;
  className: string;
  password: string;
  confirmPassword: string;
}

// For now we'll use a hardcoded userId, but in a real app this would come from auth context/redux
let hodUserId: string; // Replace with a HOD user ID

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
  } | null;
}

interface Student {
  _id: string;
  name: string;
  sap: string;
  email: string;
  className: string;
}

interface AttendanceRequest {
  _id: string;
  name: string;
  reason: string;
  proof?: string;
  subject_ids: Subject[];
  student_id: Student;
  student_ids?: Student[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  feedbackNote?: string;
}

interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function HodDashboard() {
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
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    className: '',
    password: '',
    confirmPassword: ''
  });
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const { theme, toggleTheme, setTheme } = useTheme();
  
  // Fetch all attendance requests - HOD should see all requests
  useEffect(() => {
    hodUserId = JSON.parse(localStorage.getItem('user') || '{}')._id;

    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/attendance-requests`);
        
        // Ensure res.data is an array and each request has required fields
        const responseData = Array.isArray(res.data) ? res.data.map(request => ({
          ...request,
          student_id: request.student_id || { _id: 'unknown', name: 'Unknown', sap: 'N/A', email: 'N/A', className: 'N/A' },
          subject_ids: Array.isArray(request.subject_ids) ? request.subject_ids.map((subject: Subject) => ({
            ...subject,
            teacher_id: subject.teacher_id || null
          })) : [],
          student_ids: Array.isArray(request.student_ids) ? request.student_ids : []
        })) : [];
        
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
        const res = await axios.get(`${API_BASE_URL}/attendance-requests`);
        const allRequests = Array.isArray(res.data) ? res.data : [];
        
        const stats = {
          total: allRequests.length,
          pending: allRequests.filter(req => req.status === 'pending').length,
          approved: allRequests.filter(req => req.status === 'approved').length,
          rejected: allRequests.filter(req => req.status === 'rejected').length
        };
        
        setStats(stats);
      } catch (error: any) {
        console.error('Error calculating stats:', error);
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
        (req.name?.toLowerCase() || '').includes(search) || 
        (req.reason?.toLowerCase() || '').includes(search) ||
        (req.student_id?.name?.toLowerCase() || '').includes(search) ||
        (req.student_id?.sap?.toLowerCase() || '').includes(search) ||
        (req.subject_ids || []).some(sub => (sub?.name?.toLowerCase() || '').includes(search))
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
    if (!request) return;
    
    // Ensure all required fields exist
    const safeRequest: AttendanceRequest = {
      ...request,
      student_id: request.student_id || { _id: 'unknown', name: 'Unknown', sap: 'N/A', email: 'N/A', className: 'N/A' },
      subject_ids: Array.isArray(request.subject_ids) ? request.subject_ids.map((subject: Subject) => ({
        ...subject,
        teacher_id: subject.teacher_id || null
      })) : [],
      student_ids: Array.isArray(request.student_ids) ? request.student_ids : []
    };
    
    setSelectedRequest(safeRequest);
    setIsRequestModalOpen(true);
  };

  // Open action modal (approve/reject)
  const openActionModal = (request: AttendanceRequest, action: 'approved' | 'rejected') => {
    if (!request) return;
    
    setSelectedRequest(request);
    setActionType(action);
    setFeedbackNote('');
    setIsActionModalOpen(true);
  };

  // Process the request (approve/reject)
  const processRequest = async () => {
    if (!selectedRequest || !actionType) return;
    
    try {
      setSubmitting(true);
      
      // Convert actionType to the correct status format
      const statusValue = actionType === 'approved' ? 'approved' : 'rejected';
      
      const requestData = {
        status: statusValue, // Use the converted status value
        feedbackNote: feedbackNote.trim() || undefined
      };
      
      const res = await axios.put(`${API_BASE_URL}/attendance-requests/${selectedRequest._id}/status`, requestData);
      
      // Update the requests list with the updated request
      const updatedRequests = requests.map(req => 
        req._id === selectedRequest._id ? res.data : req
      );
      
      setRequests(updatedRequests);
      
      // Update stats - also use the converted value here
      const newStats = { ...stats };
      newStats[selectedRequest.status] -= 1;
      newStats[statusValue] += 1; // Use the converted status value
      setStats(newStats);
      
      // Close modals
      setIsActionModalOpen(false);
      setIsRequestModalOpen(false);
      setActionType(null);
      setSelectedRequest(null);
      
    } catch (error: any) {
      console.error('Error processing request:', error);
      alert('Failed to process the request: ' + (error?.response?.data?.message || 'Server error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch user profile when modal opens
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await axios.get<UserData>(`${API_BASE_URL}/users/${hodUserId}`);
        setUserProfile({
          name: res.data.name || '',
          email: res.data.email || '',
          className: res.data.className || '',
          password: '',
          confirmPassword: ''
        });
      } catch (error: any) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (isUserModalOpen) {
      fetchUserProfile();
    }
  }, [isUserModalOpen]);

  // Update user profile
  const updateUserProfile = async () => {
    try {
      setUpdateError('');
      setUpdateSuccess(false);
      
      // Validate password fields if provided
      if (userProfile.password && userProfile.password !== userProfile.confirmPassword) {
        setUpdateError('Passwords do not match');
        return;
      }
      
      const userData: Partial<UserData & { password?: string }> = {
        name: userProfile.name,
        email: userProfile.email,
        className: userProfile.className
      };
      
      // Only include password if it was changed
      if (userProfile.password) {
        userData.password = userProfile.password;
      }
      
      const res = await axios.put<UserData>(`${API_BASE_URL}/users/${hodUserId}`, userData);
      
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
      
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      setUpdateError(error?.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Navbar */}
      <header className="bg-white dark:bg-gray-800 shadow transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">HOD Dashboard</h1>
          
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
                    <div className="font-medium mb-1 text-gray-800 dark:text-gray-200">Student:</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {request.student_id.name} ({request.student_id.sap})
                      {request.student_ids && request.student_ids.length > 0 && (
                        <div className="text-xs mt-1 text-gray-500 dark:text-gray-500">
                          + {request.student_ids.length} other student{request.student_ids.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    
                    {/* <div className="font-medium mt-2 mb-1 text-gray-800 dark:text-gray-200">Subjects:</div> */}
                    {/* <div className="space-y-1">
                      {request.subject_dates && request.subject_dates.length > 0 ? (
                        <>
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
                        </>
                      ) : request.subject_ids && request.subject_ids.length > 0 ? (
                        <>
                          {request.subject_ids.slice(0, 2).map((subject) => (
                            <div key={subject._id} className="text-gray-600 dark:text-gray-400">
                              {subject.name} ({subject.day}, {subject.start_time}-{subject.end_time})
                            </div>
                          ))}
                          {request.subject_ids.length > 2 && (
                            <div className="text-gray-600 dark:text-gray-400">
                              + {request.subject_ids.length - 2} more
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-600 dark:text-gray-400">No subjects found</div>
                      )}
                    </div> */}
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
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 max-h-[85vh] overflow-y-auto">
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

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Theme Preference</h4>
              <div className="p-1 bg-gray-100/90 dark:bg-gray-700/90 backdrop-blur-sm rounded-lg flex">
                <Button 
                  variant={theme === 'light' ? 'default' : 'ghost'}
                  onClick={() => {
                    console.log("Setting theme to light");
                    setTheme('light');
                  }}
                  className="flex-1 gap-2 justify-center"
                >
                  <SunIcon className="h-4 w-4" />
                  Light
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'ghost'}
                  onClick={() => {
                    console.log("Setting theme to dark");
                    setTheme('dark');
                  }}
                  className="flex-1 gap-2 justify-center"
                >
                  <MoonIcon className="h-4 w-4" />
                  Dark
                </Button>
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

            <div className="flex justify-between items-center pt-2">
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
              
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
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 max-h-[85vh] overflow-y-auto">
          {!selectedRequest ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle>{selectedRequest.name || 'Unnamed Request'}</DialogTitle>
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
                {selectedRequest.student_id && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 text-gray-800 dark:text-gray-200">Student</h4>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md">
                      <div className="font-medium text-gray-900 dark:text-gray-50">
                        {selectedRequest.student_id.name || 'Unknown Student'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        SAP: {selectedRequest.student_id.sap || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Class: {selectedRequest.student_id.className || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Email: {selectedRequest.student_id.email || 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm mb-1 text-gray-800 dark:text-gray-200">Reason</h4>
                  <p className="p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md">
                    {selectedRequest.reason || 'No reason provided'}
                  </p>
                </div>

                {selectedRequest.proof && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Supporting Document</h4>
                    <a 
                      href={`${API_BASE_URL.replace('/api', '')}${selectedRequest.proof}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-500 hover:underline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Document
                    </a>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm mb-1">Subjects</h4>
                  <div className="space-y-2">
                    {selectedRequest.subject_ids && selectedRequest.subject_ids.length > 0 ? (
                      selectedRequest.subject_ids.map((subject) => {
                        if (!subject) return null;
                        
                        return (
                          <div 
                            key={subject._id}
                            className="p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-50">
                              {subject.name || 'Unnamed Subject'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {subject.day || 'N/A'}, {subject.start_time || 'N/A'}-{subject.end_time || 'N/A'}, Class: {subject.class_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Teacher: {subject.teacher_id && subject.teacher_id.name ? subject.teacher_id.name : 'N/A'}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">No subjects found</div>
                    )}
                  </div>
                </div>

                {selectedRequest.student_ids && selectedRequest.student_ids.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Other Students Included</h4>
                    <div className="space-y-2">
                      {selectedRequest.student_ids.map((student) => {
                        if (!student) return null;
                        
                        return (
                          <div 
                            key={student._id}
                            className="p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-50">
                              {student.name || 'Unknown Student'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              SAP: {student.sap || 'N/A'}, Class: {student.className || 'N/A'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedRequest.feedbackNote && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 text-gray-800 dark:text-gray-200">Feedback</h4>
                    <p className="p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md">
                      {selectedRequest.feedbackNote}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex sm:justify-between">
                <div className="hidden sm:block"></div> {/* Spacer */}
                <div className="flex gap-3">
                  {selectedRequest.status === 'pending' && (
                    <>
                      <Button 
                        variant="destructive" 
                        className='bg-red-600 hover:bg-red-700'
                        onClick={() => openActionModal(selectedRequest, 'rejected')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button 
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => openActionModal(selectedRequest, 'approved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Modal (Approve/Reject) */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approved' 
                ? 'The student will be notified once you approve this request.'
                : 'Please provide a reason for rejecting this request.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {actionType === 'approved' ? 'Feedback (Optional)' : 'Reason for Rejection'}
              </label>
              <Textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder={actionType === 'approved' 
                  ? 'Add any additional comments (optional)'
                  : 'Provide a reason for rejection'}
                className="bg-red text-gray-900 dark:text-gray-100 h-24"
                required={actionType === 'rejected'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'approved' ? 'default' : 'destructive'}
              onClick={processRequest}
              disabled={submitting || (actionType === 'rejected' && !feedbackNote.trim())}
              className={actionType === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500'}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin bg-red" />
                  Processing...
                </>
              ) : (
                actionType === 'approved' ? 'Approve Request' : 'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
