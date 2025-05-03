import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';

const AddEmployee = () => {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    salary: '',
    number: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  // Check network connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clock update effect
  useEffect(() => {
    const timerID = setInterval(() => tick(), 1000);
    return () => clearInterval(timerID);
  }, []);

  const tick = () => {
    setCurrentTime(new Date());
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Improved fetch with timeout and retries
  const fetchWithTimeout = async (url, options, timeout = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast.error('❌ No internet connection. Please check your network.', {
        position: "top-left",
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: 'toast-error'
      });
      return;
    }

    setIsLoading(true);

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Employee name is required', {
        position: "top-left",
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: 'toast-error'
      });
      setIsLoading(false);
      return;
    }

    if (!formData.salary.trim() || isNaN(formData.salary)) {
      toast.error('Please enter a valid salary amount', {
        position: "top-left",
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: 'toast-error'
      });
      setIsLoading(false);
      return;
    }

    // Phone number validation (optional)
    if (formData.number.trim() !== '') {
      const phonePattern = /^[+\-0-9]{1,15}$/;
      if (!phonePattern.test(formData.number.trim())) {
        toast.error('Phone number can contain +, -, or digits (max 15 characters)', {
          position: "top-left",
          autoClose: 5000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: 'toast-error'
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://durgadevisweets.onrender.com';
      
      const response = await fetchWithTimeout(`${apiUrl}/employees/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          salary: parseFloat(formData.salary),
          ...(formData.role.trim() && { role: formData.role.trim() }),
          ...(formData.number.trim() && { number: formData.number.trim() }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add employee');
      }

      toast.success('✅ Employee added successfully!', {
        position: "top-left",
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: 'toast-success'
      });
      
      // Reset form after successful submission
      setFormData({ name: '', role: '', salary: '', number: '' });
      
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'Failed to add employee';

      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message.includes('already exists')) {
        errorMessage = error.message;
      } else if (error.message.includes('Invalid')) {
        errorMessage = error.message;
      }
      
      toast.error(`❌ ${errorMessage}`, {
        position: "top-left",
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: 'toast-error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSleekClock = () => {
    const hours = currentTime.getHours() % 12;
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    
    const hourDegrees = (hours * 30) + (minutes * 0.5);
    const minuteDegrees = minutes * 6;
    const secondDegrees = seconds * 6;

    const formattedTime = currentTime.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const formattedDate = currentTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });

    return (
      <div className="fixed top-6 right-6 z-50 flex flex-col items-center">
        {/* Sleek Clock Container */}
        <div className="relative w-32 h-32 flex justify-center items-center">
          {/* Clock Face */}
          <div className="relative w-28 h-28 rounded-full bg-black border-4 border-gray-800 shadow-xl">
            {/* Clock Center */}
            <div className="absolute z-10 w-2 h-2 rounded-full bg-white top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            
            {/* Hour Hand */}
            <div 
              className="absolute z-3 w-1 h-8 bg-white rounded-full origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${hourDegrees}deg)`,
                top: '50%',
                left: '50%'
              }}
            ></div>
            
            {/* Minute Hand */}
            <div 
              className="absolute z-2 w-1 h-10 bg-white rounded-full origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${minuteDegrees}deg)`,
                top: '50%',
                left: '50%'
              }}
            ></div>
            
            {/* Second Hand */}
            <div 
              className="absolute z-1 w-0.5 h-12 bg-red-500 rounded-full origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${secondDegrees}deg)`,
                top: '50%',
                left: '50%'
              }}
            ></div>
            
            {/* Minute Markers */}
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = i * 6;
              const isHourMarker = i % 5 === 0;
              const length = isHourMarker ? 8 : 4;
              const width = isHourMarker ? 2 : 1;
              
              return (
                <div
                  key={i}
                  className={`absolute ${isHourMarker ? 'bg-white' : 'bg-gray-400'} origin-bottom`}
                  style={{
                    width: `${width}px`,
                    height: `${length}px`,
                    left: '50%',
                    top: '5%',
                    transform: `translate(-50%, 0) rotate(${angle}deg) translateY(10px)`,
                    transformOrigin: 'bottom center'
                  }}
                ></div>
              );
            })}
          </div>
        </div>

        {/* Digital Time */}
        <div className="mt-4 text-center bg-black/90 backdrop-blur-sm rounded-lg p-2 border border-gray-700 shadow">
          <div className="text-md font-mono font-bold text-white">
            {formattedTime}
          </div>
          <div className="text-xs text-gray-300 mt-1">
            {formattedDate}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 min-h-screen">
      <ToastContainer 
        position="top-left"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastClassName="toast-message"
      />

      <style>
        {`
          .toast-success {
            background: linear-gradient(to right, #4f46e5, #7c3aed, #ec4899) !important;
            color: white !important;
            font-weight: bold;
            border-radius: 12px !important;
            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.5) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          .toast-error {
            background: linear-gradient(to right, #dc2626, #ea580c, #d97706) !important;
            color: white !important;
            font-weight: bold;
            border-radius: 12px !important;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.5) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          .Toastify__toast {
            margin-bottom: 0.75rem;
          }
        `}
      </style>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderSleekClock()}

        <header className="mb-10 text-center">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 tracking-tight">
            Add New Employee
          </h1>
          <p className="mt-3 text-lg text-purple-200/80 drop-shadow-lg">
            Enter employee details to add to the directory
          </p>
        </header>

        <main className="space-y-6">
          <div className="grid grid-cols-1 justify-center">
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-2xl mx-auto bg-gray-900 rounded-xl shadow-2xl p-8 border border-purple-500/40 transition-all duration-300"
            >
              <div className="space-y-6">
                {/* Name Field (Required) */}
                <div className="mb-6">
                  <label htmlFor="name" className="block text-purple-200 text-sm font-semibold mb-2 drop-shadow-md">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter employee name"
                    className="w-full px-4 py-3 rounded-xl border-2 border-purple-400/30 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                {/* Role Field (Optional) */}
                <div className="mb-6">
                  <label htmlFor="role" className="block text-purple-200 text-sm font-semibold mb-2 drop-shadow-md">
                    Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    value={formData.role}
                    onChange={handleChange}
                    placeholder="Enter job title (optional)"
                    className="w-full px-4 py-3 rounded-xl border-2 border-purple-400/30 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                </div>

                {/* Salary Field (Required) */}
                <div className="mb-6">
                  <label htmlFor="salary" className="block text-purple-200 text-sm font-semibold mb-2 drop-shadow-md">
                    Salary <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    id="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="Enter salary amount"
                    className="w-full px-4 py-3 rounded-xl border-2 border-purple-400/30 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>

                {/* Phone Number Field (Optional) */}
                <div className="mb-6">
                  <label htmlFor="number" className="block text-purple-200 text-sm font-semibold mb-2 drop-shadow-md">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="number"
                    value={formData.number}
                    onChange={handleChange}
                    placeholder="e.g., +91-9876543210 (optional)"
                    maxLength="15"
                    className="w-full px-4 py-3 rounded-xl border-2 border-purple-400/30 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                  <p className="mt-1 text-xs text-purple-300">Optional - Can include country code (max 15 characters)</p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !isOnline}
                  className={`w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-300 py-4 font-medium transform hover:scale-105 ${isLoading || !isOnline ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    !isOnline ? 'Offline - Cannot Submit' : 'Add Employee'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Back Button */}
      <div className="fixed bottom-6 right-6 z-10">
        <button
          onClick={() => navigate('/employee-management')}
          className="flex items-center px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-[0_8px_0_0_rgba(6,82,147,0.8)] hover:shadow-[0_4px_0_0_rgba(6,82,147,0.8)] hover:translate-y-1 transition-all duration-200 group"
        >
          <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back</span>
        </button>
      </div>
    </div>
  );
};

export default AddEmployee;