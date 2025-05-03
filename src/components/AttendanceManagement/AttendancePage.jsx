import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaSearch, FaChevronLeft, FaChevronRight, FaHome } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AttendancePage = () => {
  // State management
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const employeesPerPage = 10;
  const navigate = useNavigate();

  // Environment variables with defaults
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
  const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'Sri Durga Devi Sweets & Bakery';
  const DEFAULT_PROFILE_ICON = import.meta.env.VITE_DEFAULT_PROFILE_ICON || 'https://ui-avatars.com/api/?name=Unknown&background=0077BE&color=fff';

  // Loading animation component
  const LoadingBubbles = () => (
    <div className="flex justify-center items-center py-12">
      <div className="flex gap-2">
        <div className="w-4 h-4 rounded-full bg-[#0077BE] animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-4 h-4 rounded-full bg-[#00A9E0] animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-4 h-4 rounded-full bg-[#0077BE] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );

  // Employee card component
  const EmployeeCard = React.memo(({ employee, onViewReports }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between py-4 px-2 hover:bg-gray-50 transition duration-200 hover:shadow-sm">
      <div className="flex items-center space-x-4 mb-4 sm:mb-0 w-full sm:w-auto">
        <div className="relative">
          <img
            src={employee.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name || '')}&background=0077BE&color=fff`}
            alt={`${employee.name}'s profile`}
            className="w-12 h-12 rounded-full shadow-sm border-2 border-white transition-transform duration-200 hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.target.src = DEFAULT_PROFILE_ICON;
            }}
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00A9E0] rounded-full border-2 border-white"></div>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-lg font-semibold text-gray-800">{employee.name}</p>
          <p className="text-gray-500">Role: {employee.role || "N/A"}</p>
          <p className="text-gray-500">ID: {employee.id}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto justify-center">
        <Link 
          to={`/mark-attendance/${employee.id}`} 
          className="px-4 py-2 bg-[#0077BE] text-white rounded-md hover:bg-[#0066A3] transition-all duration-200 hover:shadow-md text-center whitespace-nowrap"
        >
          Mark Attendance
        </Link>
        <button 
          onClick={() => onViewReports(employee.id)}
          className="px-4 py-2 bg-[#00A9E0] text-white rounded-md hover:bg-[#0098CA] transition-all duration-200 hover:shadow-md whitespace-nowrap"
        >
          View Reports
        </button>
      </div>
    </div>
  ));

  // API call with enhanced error handling and CORS workaround
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First try with proxy
      const response = await fetch(`${API_BASE_URL}/employees/all`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setEmployees(data);
      
      // Cache the response
      const cacheKey = `employees_${API_BASE_URL}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError(err.message);
      toast.error('Failed to load employees. Please try again later.');
      
      // Fallback to direct API call if proxy fails (development only)
      if (import.meta.env.DEV && API_BASE_URL === '/api') {
        try {
          toast.info('Attempting direct connection to backend...');
          const directResponse = await fetch('http://localhost:8080/employees/all', {
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (directResponse.ok) {
            const directData = await directResponse.json();
            setEmployees(directData);
            toast.success('Connected directly to backend (CORS workaround)');
          } else {
            toast.error('Direct connection failed');
          }
        } catch (directErr) {
          console.error("Direct fetch also failed:", directErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  // Memoized filtered employees
  const filteredEmployees = useMemo(() => 
    employees.filter(emp => 
      emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.id?.toString().includes(search.toLowerCase()) ||
      emp.role?.toLowerCase().includes(search.toLowerCase())
    ),
    [employees, search]
  );

  // Memoized paginated employees with unique keys
  const paginatedEmployees = useMemo(() => {
    const indexOfLastEmployee = currentPage * employeesPerPage;
    const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
    return filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);
  }, [filteredEmployees, currentPage, employeesPerPage]);

  // Handlers with memoization
  const handleViewReports = useCallback((employeeId) => {
    navigate(`/attendance-summary/${employeeId}`);
  }, [navigate]);

  const handleLogoClick = useCallback(() => {
    navigate('/attendance');
  }, [navigate]);

  const handleBackToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  }, []);

  // Navbar component
  const Navbar = React.memo(() => (
    <nav className="bg-[#0077BE] shadow-md relative h-16 w-full">
      <div className="h-full w-full px-6">
        <div 
          className="absolute left-6 top-1/2 transform -translate-y-1/2 flex items-center cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
        >
          <img 
            className="h-10 w-auto max-h-[40px] mr-2" 
            src="/assets/logo.png" 
            alt="Company Logo"
            loading="lazy"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/150x40?text=Logo';
            }}
          />
          <span className="text-xl font-bold text-white tracking-wide whitespace-nowrap font-sans">
            {COMPANY_NAME}
          </span>
        </div>

        <div className="absolute right-6 top-1/2 transform -translate-y-1/2 flex space-x-4 font-sans">
          <Link 
            to="/employee-management" 
            className="text-white hover:bg-[#0066A3] px-4 py-2 rounded-md text-base font-medium transition-all duration-200 hover:shadow-md whitespace-nowrap"
          >
            Employee Management
          </Link>
          <Link
            to="/bulk-attendance"
            className="text-white hover:bg-[#0066A3] px-4 py-2 rounded-md text-base font-medium transition-all duration-200 hover:shadow-md whitespace-nowrap"
          >
            Bulk Attendance
          </Link>
          <Link 
            to="/attendance-summary" 
            className="text-white hover:bg-[#0066A3] px-4 py-2 rounded-md text-base font-medium transition-all duration-200 hover:shadow-md whitespace-nowrap"
          >
            Attendance Reports
          </Link>
        </div>
      </div>
    </nav>
  ));

  // Initial load and cache handling
  useEffect(() => {
    const cacheKey = `employees_${API_BASE_URL}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      setEmployees(JSON.parse(cachedData));
    } else {
      fetchEmployees();
    }

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        fetchEmployees();
      }
    };
    
    document.addEventListener('visibilitychange', visibilityHandler);
    return () => document.removeEventListener('visibilitychange', visibilityHandler);
  }, [fetchEmployees]);

  return (
    <div className="relative min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Employee Attendance
          </h1>
          <p className="text-gray-600 mt-2">
            View and manage employee attendance records
          </p>
        </div>
        
        <div className="flex justify-center mb-6">
          <div className="relative w-full max-w-md transition-all duration-200 hover:shadow-lg">
            <input
              type="text"
              placeholder="Search employees by name, ID or role..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-[#0077BE] focus:outline-none transition-all duration-200"
              value={search}
              onChange={handleSearchChange}
              aria-label="Search employees"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          {isLoading ? (
            <LoadingBubbles />
          ) : error ? (
            <div className="text-center text-red-500 py-4">
              {error} <button onClick={fetchEmployees} className="text-blue-600 underline">Retry</button>
            </div>
          ) : paginatedEmployees.length > 0 ? (
            paginatedEmployees.map((emp) => (
              <EmployeeCard 
                key={emp.id}
                employee={emp}
                onViewReports={handleViewReports}
              />
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">
              {search ? 'No matching employees found' : 'No employees available'}
            </p>
          )}
        </div>

        {!isLoading && !error && filteredEmployees.length > employeesPerPage && (
          <div className="mt-6 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              className={`px-4 py-2 rounded-md flex items-center transition-all duration-200 ${
                currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#0077BE] text-white hover:bg-[#0066A3] hover:shadow-md'
              }`}
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous page"
            >
              <FaChevronLeft className="mr-1" /> Prev
            </button>
            <span className="px-4 py-2 font-medium">
              Page {currentPage} of {Math.ceil(filteredEmployees.length / employeesPerPage)}
            </span>
            <button
              className={`px-4 py-2 rounded-md flex items-center transition-all duration-200 ${
                currentPage >= Math.ceil(filteredEmployees.length / employeesPerPage) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#0077BE] text-white hover:bg-[#0066A3] hover:shadow-md'
              }`}
              disabled={currentPage >= Math.ceil(filteredEmployees.length / employeesPerPage)}
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next page"
            >
              Next <FaChevronRight className="ml-1" />
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleBackToHome}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-[#0077BE] text-white rounded-lg shadow-lg hover:bg-[#0066A3] transition-all duration-200 hover:shadow-xl flex items-center"
        aria-label="Back to home"
      >
        <FaHome className="mr-2" />
        Back to Home
      </button>
    </div>
  );
};

export default React.memo(AttendancePage);