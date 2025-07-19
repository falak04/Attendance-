import { useState, useEffect } from 'react';
import { Calendar, Clock, Edit, Plus, Save, Trash, Download, Moon, Sun, Upload, Check } from 'lucide-react';
import { useTheme } from '../ThemeProvider'; // Import the useTheme hook
import axios from 'axios';

const API_URL = 'http://localhost:4001/api';

export default function TimetableManagement() {
  // Access theme context
  const { theme, toggleTheme } = useTheme();

  // State for selected class and timetable data
  const [selectedClass, setSelectedClass] = useState('I1');
  const [timetable, setTimetable] = useState([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  
  // Form state
  const [subjectForm, setSubjectForm] = useState({
    id: '',
    start_time: '08:00',
    end_time: '09:00',
    teacher_name: '',
    teacher_id: '',
    name: '',
    class_name: 'I1',
    day: 'Monday'
  });
  
  // Add state to store both teacher names and IDs
  const [teacherData, setTeacherData] = useState([]);

  // Modify the fetchTeachers function
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        try {
          const response = await axios.get(`${API_URL}/users/teachers`);
          console.log('Teachers API response:', response.data);
          
          if (response.data && response.data.length > 0) {
            setTeacherData(response.data);
            setIsLoading(false);
            return;
          }
        } catch (mainError) {
          console.error('Error with main teachers endpoint:', mainError);
          // Fallback to sample data
          const sampleTeachers = [
            { _id: '1', name: 'Dr. Smith', email: 'smith@example.com' },
            { _id: '2', name: 'Prof. Johnson', email: 'johnson@example.com' },
            { _id: '3', name: 'Ms. Williams', email: 'williams@example.com' },
            { _id: '4', name: 'Mr. Brown', email: 'brown@example.com' },
            { _id: '5', name: 'Dr. Davis', email: 'davis@example.com' }
          ];
          setTeacherData(sampleTeachers);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Overall error in fetchTeachers:', error);
        // Fallback to sample data
        const sampleTeachers = [
          { _id: '1', name: 'Dr. Smith', email: 'smith@example.com' },
          { _id: '2', name: 'Prof. Johnson', email: 'johnson@example.com' },
          { _id: '3', name: 'Ms. Williams', email: 'williams@example.com' },
          { _id: '4', name: 'Mr. Brown', email: 'brown@example.com' },
          { _id: '5', name: 'Dr. Davis', email: 'davis@example.com' }
        ];
        setTeacherData(sampleTeachers);
        setIsLoading(false);
      }
    };
    
    fetchTeachers();
  }, []);
  
  // Days of the week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Time slots from 8:00 AM to 5:00 PM (hourly intervals)
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 8;
    return `${hour < 10 ? '0' + hour : hour}:00`;
  });
  
  // Add a new state variable for viewing subject details
  const [isViewingSubject, setIsViewingSubject] = useState(false);
  const [viewingSubject, setViewingSubject] = useState(null);
  
  // Check for mobile view on window resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    checkScreenSize();
    
    // Add listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Clean up
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Add a loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Define API URL

  // Load sample data on initial render
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await axios.get(`${API_URL}/subjects`);
        setTimetable(response.data);
      } catch (error) {
        console.error('Error fetching timetable:', error);
        // Fallback to sample data if the API call fails
        const sampleData = [
          { id: '1', start_time: '08:00', end_time: '09:30', teacher_name: 'Dr. Smith', name: 'Mathematics', class_name: 'I1', day: 'Monday' },
          { id: '10', start_time: '08:00', end_time: '09:30', teacher_name: 'Dr. Smith New', name: 'Mathematics 2', class_name: 'I1', day: 'Monday' },
          { id: '2', start_time: '10:00', end_time: '11:30', teacher_name: 'Prof. Johnson', name: 'Physics', class_name: 'I1', day: 'Monday' },
          { id: '3', start_time: '13:00', end_time: '14:30', teacher_name: 'Ms. Williams', name: 'Chemistry', class_name: 'I1', day: 'Tuesday' },
          { id: '4', start_time: '09:00', end_time: '10:30', teacher_name: 'Mr. Brown', name: 'Computer Science', class_name: 'I2', day: 'Wednesday' },
          { id: '5', start_time: '11:00', end_time: '12:30', teacher_name: 'Dr. Davis', name: 'Biology', class_name: 'I3', day: 'Thursday' },
          { id: '6', start_time: '14:00', end_time: '15:30', teacher_name: 'Dr. Wilson', name: 'Weekend Lab', class_name: 'I1', day: 'Saturday' },
          
          // Additional Saturday subjects for the selected class
          { id: '7', start_time: '08:00', end_time: '09:30', teacher_name: 'Dr. Adams', name: 'Saturday Morning Lab', class_name: 'I1', day: 'Saturday' },
          { id: '8', start_time: '10:00', end_time: '11:30', teacher_name: 'Prof. Lee', name: 'Special Workshop', class_name: 'I1', day: 'Saturday' },
        ];
        setTimetable(sampleData);
      }
    };

    fetchTimetable();
  }, []);
  
  // Filter timetable based on selected class and day (for mobile view)
  const filteredTimetable = isMobileView 
    ? timetable.filter(subject => subject.class_name === selectedClass && subject.day === selectedDay)
    : timetable.filter(subject => subject.class_name === selectedClass);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for teacher selection
    if (name === 'teacher_id') {
      // Find the selected teacher
      const selectedTeacher = teacherData.find(teacher => teacher._id === value);
      
      setSubjectForm(prev => ({
        ...prev,
        teacher_id: value,
        teacher_name: selectedTeacher ? selectedTeacher.name : ''
      }));
    } else {
      setSubjectForm(prev => ({
        ...prev,
        [name]: value,
        class_name: selectedClass
      }));
    }
  };
  
  // Add a CSV import feature
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // Update the handleAddSubject function to use the API
  const handleAddSubject = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Prepare data for the backend with teacher_id
      const subjectData = {
        name: subjectForm.name,
        start_time: subjectForm.start_time,
        end_time: subjectForm.end_time,
        teacher_id: subjectForm.teacher_id, // Send teacher_id to the backend
        class_name: subjectForm.class_name || selectedClass,
        day: subjectForm.day
      };
      
      console.log('Sending to backend:', subjectData);
      
      if (isEditingSubject) {
        // Update existing subject
        const response = await axios.put(`${API_URL}/subjects/${editingSubjectId}`, subjectData);
        setTimetable(prev => prev.map(subject => 
          subject.id === editingSubjectId ? response.data : subject
        ));
      } else {
        // Add new subject
        const response = await axios.post(`${API_URL}/subjects`, subjectData);
        setTimetable(prev => [...prev, response.data]);
      }
      
      // Reset form
      setSubjectForm({
        id: '',
        start_time: '08:00',
        end_time: '09:00',
        teacher_name: '',
        teacher_id: '',
        name: '',
        class_name: selectedClass,
        day: isMobileView ? selectedDay : 'Monday'
      });
      setIsAddingSubject(false);
      setIsEditingSubject(false);
      setEditingSubjectId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
      console.error('Error saving subject:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update the handleDeleteSubject function
  const handleDeleteSubject = async (id) => {
    try {
      setIsLoading(true);
      await axios.delete(`${API_URL}/subjects/${id}`);
      setTimetable(prev => prev.filter(subject => subject.id !== id));
      if (isViewingSubject && viewingSubject && viewingSubject.id === id) {
        setIsViewingSubject(false);
      }
    } catch (err) {
      console.error('Error deleting subject:', err);
      setError(err.response?.data?.message || 'An error occurred while deleting');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Edit subject
  const handleEditSubject = (subject) => {
    setSubjectForm(subject);
    setIsEditingSubject(true);
    setEditingSubjectId(subject.id);
    setIsAddingSubject(true);
  };
  
  // Update the exportToCSV function to get real-time data
  const exportToCSV = async () => {
    try {
      setIsLoading(true);
      // Get the latest data for the selected class
      const response = await axios.get(`${API_URL}/subjects/class/${selectedClass}`);
      const classData = response.data;
      
      const headers = 'id,start_time,end_time,teacher_name,name,class_name,day\n';
      const csvData = classData.map(subject => 
        `${subject.id},${subject.start_time},${subject.end_time},${subject.teacher_name},${subject.name},${subject.class_name},${subject.day}`
      ).join('\n');
      
      const blob = new Blob([headers + csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable_${selectedClass}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting timetable:', err);
      setError(err.response?.data?.message || 'An error occurred while exporting');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get subject at specific time and day - keep this for compatibility
  const getSubjectAt = (day, time) => {
    return filteredTimetable.find(subject => 
      subject.day === day && 
      subject.start_time <= time && 
      subject.end_time > time
    );
  };

  // Get all subjects that start at a specific time and day
  const getSubjectsStartingAt = (day, time) => {
    return filteredTimetable.filter(subject => 
      subject.day === day && 
      subject.start_time === time
    );
  };

  // Improve the time height calculation to be more precise
  const calculateTimeHeight = (startTime, endTime) => {
    const startHour = parseInt(startTime.split(':')[0]);
    const startMinutes = parseInt(startTime.split(':')[1]);
    const endHour = parseInt(endTime.split(':')[0]);
    const endMinutes = parseInt(endTime.split(':')[1]);
    
    const startTotalMinutes = startHour * 60 + startMinutes;
    const endTotalMinutes = endHour * 60 + endMinutes;
    const durationInMinutes = endTotalMinutes - startTotalMinutes;
    
    // Each time slot is exactly 64px (h-16)
    return `${Math.max(durationInMinutes / 60, 0.5) * 64}px`;
  };

  // Improve the getSubjectColorClass function for better distinction
  const getSubjectColorClass = (idx, hasOverlap) => {
    if (!hasOverlap) return getSubjectBoxBgClass();
    
    // More distinct color combinations for overlapping subjects
    const colors = [
      theme === 'dark' ? 'bg-blue-800' : 'bg-blue-100',
      theme === 'dark' ? 'bg-green-800' : 'bg-green-100',
      theme === 'dark' ? 'bg-purple-800' : 'bg-purple-100',
      theme === 'dark' ? 'bg-orange-800' : 'bg-orange-100',
      theme === 'dark' ? 'bg-pink-800' : 'bg-pink-100'
    ];
    
    return colors[idx % colors.length];
  };

  // Get text color based on the background
  const getTextColorForSubject = (idx, hasOverlap) => {
    if (!hasOverlap) return getSubjectTextClass();
    
    const colors = [
      theme === 'dark' ? 'text-blue-100' : 'text-blue-800',
      theme === 'dark' ? 'text-green-100' : 'text-green-800',
      theme === 'dark' ? 'text-purple-100' : 'text-purple-800',
      theme === 'dark' ? 'text-orange-100' : 'text-orange-800',
      theme === 'dark' ? 'text-pink-100' : 'text-pink-800'
    ];
    
    return colors[idx % colors.length];
  };

  // Class names with dark mode context
  const getBgClass = () => theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const getCardBgClass = () => theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const getBorderClass = () => theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const getHeaderBgClass = () => theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const getTextClass = () => theme === 'dark' ? 'text-gray-100' : 'text-gray-800';
  const getSubTextClass = () => theme === 'dark' ? 'text-gray-300' : 'text-gray-600';
  const getSubjectBgClass = () => theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50';
  const getSubjectBoxBgClass = () => theme === 'dark' ? 'bg-blue-800' : 'bg-blue-100';
  const getSubjectTextClass = () => theme === 'dark' ? 'text-blue-100' : 'text-blue-800';
  const getInputBgClass = () => theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
  const getInputTextClass = () => theme === 'dark' ? 'text-gray-100' : 'text-gray-700';

  // Function to handle clicking on a subject card
  const handleViewSubject = (subject) => {
    setViewingSubject(subject);
    setIsViewingSubject(true);
  };

  // Add a CSV import feature
  const handleImportCSV = async () => {
    if (!importFile) {
      setError('Please select a CSV file first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Create form data to send the file
      const formData = new FormData();
      formData.append('file', importFile);
      
      // Send the file to the API
      const response = await axios.post(`${API_URL}/subjects/import/csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Refresh the timetable
      const timetableResponse = await axios.get(`${API_URL}/subjects`);
      setTimetable(timetableResponse.data);
      
      // Reset state
      setImportFile(null);
      setIsImportModalOpen(false);
      
      // Show success message
      alert(`Successfully imported ${response.data.created.length} subjects.`);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while importing');
      console.error('Error importing subjects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Add an Import Modal
  {isImportModalOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${getCardBgClass()} rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-lg sm:text-xl font-bold ${getTextClass()}`}>Import Timetable</h2>
          <button 
            onClick={() => setIsImportModalOpen(false)}
            className={`${getSubTextClass()} hover:text-gray-700 dark:hover:text-gray-300 text-xl`}
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <label className="cursor-pointer block">
              <input 
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImportFile(e.target.files[0]);
                  }
                }}
              />
              <Upload size={36} className="mx-auto mb-2 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                Drag and drop your CSV file here, or click to browse
              </p>
              <button
                type="button"
                className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg"
              >
                Browse Files
              </button>
            </label>
          </div>
          
          {importFile && (
            <div className="flex items-center justify-center">
              <Check size={20} className="text-green-500 mr-2" />
              <span>{importFile.name}</span>
            </div>
          )}
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className={`px-4 py-2 border ${getBorderClass()} rounded-md ${getTextClass()} hover:bg-gray-100 dark:hover:bg-gray-700`}
            >
              Cancel
            </button>
            <button
              onClick={handleImportCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              disabled={!importFile || isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={18} className="mr-1" />
                  Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  return (
    <div className={`flex flex-col w-full max-w-6xl mx-auto p-2 sm:p-4 ${getBgClass()} rounded-lg shadow transition-colors duration-300`}>
      {/* Header with class selection */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <h1 className={`text-xl sm:text-2xl font-bold ${getTextClass()}`}>Timetable Management</h1>
          <div className={`flex items-center ${getCardBgClass()} rounded-md shadow-sm border ${getBorderClass()} w-full sm:w-auto`}>
            <label htmlFor="class-select" className={`px-3 py-2 ${getSubTextClass()}`}>Class:</label>
            <select 
              id="class-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={`px-3 py-2 ${getCardBgClass()} border-l ${getBorderClass()} rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getTextClass()}`}
            >
              <option value="I1">I1</option>
              <option value="I2">I2</option>
              <option value="I3">I3</option>
            </select>
          </div>
          
          {/* Mobile view day selector */}
          {isMobileView && (
            <div className={`flex items-center ${getCardBgClass()} rounded-md shadow-sm border ${getBorderClass()} mt-2 sm:mt-0 w-full sm:w-auto`}>
              <label htmlFor="day-select" className={`px-3 py-2 ${getSubTextClass()}`}>Day:</label>
              <select 
                id="day-select"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className={`px-3 py-2 ${getCardBgClass()} border-l ${getBorderClass()} rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getTextClass()}`}
              >
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
         
          <button 
            onClick={() => setIsAddingSubject(true)} 
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            <Plus size={18} className="mr-1" />
            <span className="hidden sm:inline">Add Subject</span>
            <span className="sm:hidden">Add</span>
          </button>
          <button 
            onClick={exportToCSV} 
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            <Download size={18} className="mr-1" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          {/* <button 
            onClick={() => setIsImportModalOpen(true)} 
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
          >
            <Upload size={18} className="mr-1" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </button> */}
        </div>
      </div>
      
      {/* Timetable Calendar View */}
      <div className={`${getCardBgClass()} rounded-lg shadow border ${getBorderClass()} overflow-hidden overflow-x-auto`}>
        {/* Desktop view */}
        {!isMobileView && (
          <>
            <div className="grid grid-cols-7 border-b border-gray-200 min-w-max">
              <div className={`py-3 px-4 ${getHeaderBgClass()} font-semibold border-r ${getBorderClass()} ${getTextClass()}`}>Time</div>
              {days.map(day => (
                <div key={day} className={`py-3 px-4 ${getHeaderBgClass()} font-semibold border-r ${getBorderClass()} text-center ${getTextClass()}`}>
                  {day}
                </div>
              ))}
            </div>
            
            {/* Time slots */}
            {timeSlots.map((time, index) => (
              <div key={time} className={`grid grid-cols-7 border-b ${getBorderClass()} min-w-max`}>
                <div className={`py-3 px-1 border-r ${getBorderClass()} flex items-center ${getTextClass()}`}>
                  <Clock size={16} className="mr-2 text-gray-500" />
                  {time} - {index < 9 ? timeSlots[index + 1] : '18:00'}
                </div>
                
                {/* Days */}
                {days.map(day => {
                  const subjectsStartingHere = getSubjectsStartingAt(day, time);
                  const hasOverlap = subjectsStartingHere.length > 1;
                  
                  return (
                    <div 
                      key={`${day}-${time}`} 
                      className={`border-r ${getBorderClass()} relative h-16`}
                    >
                      {subjectsStartingHere.map((subject, idx) => {
                        const height = calculateTimeHeight(subject.start_time, subject.end_time);
                        const width = hasOverlap ? `${100 / subjectsStartingHere.length}%` : '100%';
                        const leftPosition = hasOverlap ? `${(idx * 100) / subjectsStartingHere.length}%` : '0';
                        const textColor = getTextColorForSubject(idx, hasOverlap);
                        
                        return (
                          <div 
                            key={subject.id}
                            className={`absolute top-0 rounded shadow-md p-2 flex flex-col overflow-hidden 
                              ${getSubjectColorClass(idx, hasOverlap)} 
                              transition-all duration-200 
                              hover:z-20 hover:shadow-lg hover:scale-[1.02]
                              cursor-pointer`}
                            style={{ 
                              height: height,
                              width: `calc(${width} - 4px)`,
                              left: leftPosition,
                              zIndex: 5 + idx,
                              marginLeft: '2px',
                              marginRight: '2px',
                            }}
                            onClick={() => handleViewSubject(subject)}
                            title={`Click to view details`}
                          >
                            
                            <div className="flex justify-between items-start mb-1">
                              <span className={`font-medium ${textColor} truncate`}>{subject.name}</span>
                            </div>
                            <span className={`text-sm ${textColor} opacity-90 truncate`}>{subject.teacher_name}</span>
                            <span className="text-xs mt-auto pt-1 opacity-80">{subject.start_time} - {subject.end_time}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
        
        {/* Mobile view - single day view */}
        {isMobileView && (
          <>
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className={`py-3 px-4 ${getHeaderBgClass()} font-semibold border-r ${getBorderClass()} ${getTextClass()}`}>Time</div>
              <div className={`py-3 px-4 ${getHeaderBgClass()} font-semibold ${getTextClass()}`}>{selectedDay}</div>
            </div>
            
            {/* Time slots */}
            {timeSlots.map((time, index) => {
              const subjectsStartingHere = getSubjectsStartingAt(selectedDay, time);
              const hasOverlap = subjectsStartingHere.length > 1;
              
              return (
                <div key={time} className={`grid grid-cols-2 border-b ${getBorderClass()}`}>
                  <div className={`py-3 px-4 border-r ${getBorderClass()} flex items-center ${getTextClass()} h-16`}>
                    <Clock size={16} className="mr-2 text-gray-500" />
                    {time} - {index < 9 ? timeSlots[index + 1] : '18:00'}
                  </div>
                  
                  <div className="relative h-16">
                    {subjectsStartingHere.map((subject, idx) => {
                      const height = calculateTimeHeight(subject.start_time, subject.end_time);
                      const width = hasOverlap ? `${100 / subjectsStartingHere.length}%` : '100%';
                      const leftPosition = hasOverlap ? `${(idx * 100) / subjectsStartingHere.length}%` : '0';
                      const textColor = getTextColorForSubject(idx, hasOverlap);
                      
                      return (
                        <div 
                          key={subject.id}
                          className={`absolute top-0 rounded shadow-md p-2 flex flex-col overflow-hidden 
                            ${getSubjectColorClass(idx, hasOverlap)} 
                            transition-all duration-200
                            hover:z-20 hover:shadow-lg hover:scale-[1.02]`}
                          style={{ 
                            height: height,
                            width: `calc(${width} - 4px)`,
                            left: leftPosition,
                            zIndex: 5 + idx,
                            marginLeft: '2px',
                            marginRight: '2px',
                          }}
                          onClick={() => handleViewSubject(subject)}
                          title={`${subject.name} - ${subject.teacher_name} (${subject.start_time}-${subject.end_time})`}
                        >
                          {hasOverlap && (
                            <div className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center">
                              <div className="w-3 h-3 bg-yellow-400 rounded-full" title="Multiple subjects scheduled"></div>
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-medium ${textColor} truncate mr-1`}>{subject.name}</span>
                          </div>
                          <span className={`text-sm ${textColor} opacity-90 truncate`}>{subject.teacher_name}</span>
                          <span className="text-xs mt-auto pt-1 opacity-80">{subject.start_time} - {subject.end_time}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      
      {/* Add/Edit Subject Form Modal */}
      {isAddingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${getCardBgClass()} rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg sm:text-xl font-bold ${getTextClass()}`}>
                {isEditingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h2>
              <button 
                onClick={() => {
                  setIsAddingSubject(false);
                  setIsEditingSubject(false);
                }}
                className={`${getSubTextClass()} hover:text-gray-700 text-xl`}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>Subject Name</label>
                <input
                  type="text"
                  name="name"
                  value={subjectForm.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                  placeholder="e.g. Mathematics"
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>Day</label>
                <select
                  name="day"
                  value={subjectForm.day}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                >
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>Start Time</label>
                  <input
                    type="time"
                    name="start_time"
                    value={subjectForm.start_time}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                    required
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>End Time</label>
                  <input
                    type="time"
                    name="end_time"
                    value={subjectForm.end_time}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>Teacher</label>
                <select
                  name="teacher_id"
                  value={subjectForm.teacher_id}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                  required
                >
                  <option value="">Select a teacher</option>
                  {teacherData.map(teacher => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsAddingSubject(false);
                    setIsEditingSubject(false);
                  }}
                  className={`px-4 py-2 border ${getBorderClass()} rounded-md ${getTextClass()} hover:bg-gray-100 dark:hover:bg-gray-700`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSubject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  disabled={!subjectForm.name || !subjectForm.teacher_id}
                >
                  <Save size={18} className="mr-1" />
                  {isEditingSubject ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Subject Details Modal */}
      {isViewingSubject && viewingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${getCardBgClass()} rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg sm:text-xl font-bold ${getTextClass()}`}>
                Subject Details
              </h2>
              <button 
                onClick={() => setIsViewingSubject(false)}
                className={`${getSubTextClass()} hover:text-gray-700 dark:hover:text-gray-300 text-xl`}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className={`p-3 rounded-lg ${getSubjectColorClass(0, false)} mb-4`}>
                <h3 className={`text-lg font-bold ${getSubjectTextClass()}`}>{viewingSubject.name}</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Teacher:</span>
                    <span className={`font-medium ${getTextClass()}`}>{viewingSubject.teacher_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Day:</span>
                    <span className={`font-medium ${getTextClass()}`}>{viewingSubject.day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Time:</span>
                    <span className={`font-medium ${getTextClass()}`}>{viewingSubject.start_time} - {viewingSubject.end_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Class:</span>
                    <span className={`font-medium ${getTextClass()}`}>{viewingSubject.class_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Subject ID:</span>
                    <span className={`font-medium ${getTextClass()}`}>{viewingSubject.id}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => {
                    handleDeleteSubject(viewingSubject.id);
                    setIsViewingSubject(false);
                  }}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition flex items-center"
                >
                  <Trash size={16} className="mr-1" />
                  Delete
                </button>
                <div className="space-x-2">
                  <button
                    onClick={() => setIsViewingSubject(false)}
                    className={`px-4 py-2 border ${getBorderClass()} rounded-md ${getTextClass()} hover:bg-gray-100 dark:hover:bg-gray-700 transition`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleEditSubject(viewingSubject);
                      setIsViewingSubject(false);
                    }}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition flex items-center"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}