import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  FaSearch, 
  FaUserCircle, 
  FaArrowUp, 
  FaArrowDown, 
  FaArrowLeft, 
  FaSpinner, 
  FaCalendarAlt,
  FaFileCsv,
  FaFilePdf,
  FaHome,
  FaUsers,
  FaChartPie,
  FaCheckCircle,
  FaTimesCircle,
  FaClock
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as echarts from 'echarts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Cache for dashboard data
const dashboardCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes cache
};

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const chartRef = React.useRef(null);
  
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Summary statistics
  const summary = useMemo(() => {
    const present = attendanceData.filter(item => item.status === 'present').length;
    const absent = attendanceData.filter(item => item.status === 'absent').length;
    const halfDay = attendanceData.filter(item => item.status === 'half-day').length;
    
    return {
      present,
      absent,
      halfDay,
      total: attendanceData.length
    };
  }, [attendanceData]);

  // Memoized filtered data
  const filteredData = useMemo(() => {
    let result = [...attendanceData];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.employeeName.toLowerCase().includes(term) ||
        String(item.employeeId).includes(term) ||
        item.department?.toLowerCase().includes(term) ||
        item.position?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }
    
    return result;
  }, [searchTerm, statusFilter, attendanceData]);

  // Memoized toast function
  const showToast = useCallback((type, message) => {
    const toastConfig = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className: `toast-${type} animate__animated animate__fadeInRight`,
      style: {
        background: 'linear-gradient(to right, #8B5CF6, #EC4899)',
        color: '#fff',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
        borderRadius: '12px',
        margin: '10px',
        width: 'auto',
        minWidth: '300px'
      }
    };

    switch(type) {
      case 'success':
        toast.success(message, toastConfig);
        break;
      case 'warning':
        toast.warning(message, toastConfig);
        break;
      case 'error':
        toast.error(message, toastConfig);
        break;
      case 'info':
        toast.info(message, toastConfig);
        break;
      default:
        toast(message, toastConfig);
    }
  }, []);

  // Fetch attendance data with caching
  const fetchAttendanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check cache first
      const now = Date.now();
      if (dashboardCache.data && now - dashboardCache.timestamp < dashboardCache.CACHE_DURATION) {
        setAttendanceData(dashboardCache.data);
        setIsLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/attendance/all-today-status`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process data to match expected format
      const processedData = data.map(item => ({
        employeeId: item.employeeId || 0,
        employeeName: item.employeeName || 'Unknown',
        status: (item.attendanceStatus || 'absent').toLowerCase() === 'halfday' 
          ? 'half-day' 
          : (item.attendanceStatus || 'absent').toLowerCase(),
        date: item.currentDate || today,
        department: item.department || 'N/A',
        position: item.position || 'N/A'
      }));
      
      // Update cache
      dashboardCache.data = processedData;
      dashboardCache.timestamp = now;
      
      setAttendanceData(processedData);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      showToast('error', 'Failed to load attendance data. Please try again later.');
      
      // Fallback to cache even if stale
      if (dashboardCache.data) {
        setAttendanceData(dashboardCache.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showToast, today]);

  // Initialize or update chart
  useEffect(() => {
    if (filteredData.length > 0 && chartRef.current) {
      const chart = echarts.getInstanceByDom(chartRef.current) || echarts.init(chartRef.current);
      
      const statusCounts = filteredData.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'horizontal',
          bottom: 0,
          data: ['Present', 'Absent', 'Half Day'],
          textStyle: {
            color: '#6B7280',
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        series: [
          {
            name: 'Attendance Status',
            type: 'pie',
            radius: ['50%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '18',
                fontWeight: 'bold',
                formatter: '{b}\n{c} ({d}%)'
              }
            },
            labelLine: {
              show: false
            },
            data: [
              {
                value: statusCounts.present || 0,
                name: 'Present',
                itemStyle: {
                  color: '#8B5CF6'
                }
              },
              {
                value: statusCounts.absent || 0,
                name: 'Absent',
                itemStyle: {
                  color: '#EC4899'
                }
              },
              {
                value: statusCounts['half-day'] || 0,
                name: 'Half Day',
                itemStyle: {
                  color: '#A78BFA'
                }
              }
            ]
          }
        ]
      };
      
      chart.setOption(option);
      
      const handleResize = () => {
        chart.resize();
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, [filteredData]);

  // Initial data fetch with auto-refresh
  useEffect(() => {
    fetchAttendanceData();
    
    const interval = setInterval(fetchAttendanceData, 300000); // 5 minutes
    
    return () => {
      clearInterval(interval);
    };
  }, [fetchAttendanceData]);

  // Export to PDF
  const exportToPDF = useCallback(() => {
    try {
      showToast('info', 'Preparing PDF export...');
      
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(139, 92, 246);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, 'F');
      
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('Employee Attendance Report', 105, 20, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 40);
      doc.text(`Generated At: ${new Date().toLocaleTimeString()}`, 14, 47);
      
      // Summary
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(0.5);
      doc.line(14, 55, 60, 55);
      
      doc.setFontSize(14);
      doc.text('Attendance Summary', 14, 65);
      
      doc.setFontSize(12);
      doc.text(`Present: ${summary.present}`, 14, 75);
      doc.text(`Absent: ${summary.absent}`, 14, 85);
      doc.text(`Half Day: ${summary.halfDay}`, 14, 95);
      doc.text(`Total Employees: ${summary.total}`, 14, 105);
      
      // Table data
      const headers = [['ID', 'Name', 'Department', 'Position', 'Status']];
      const rows = filteredData.map(item => [
        item.employeeId,
        item.employeeName,
        item.department,
        item.position,
        item.status.charAt(0).toUpperCase() + item.status.slice(1)
      ]);
      
      // Add table
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 120,
        headStyles: {
          fillColor: [139, 92, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 243, 255]
        },
        didParseCell: (data) => {
          if (data.column.index === 4) { // Status column
            const status = data.cell.raw.toLowerCase();
            if (status === 'present') {
              data.cell.styles.fillColor = [237, 233, 254];
              data.cell.styles.textColor = [109, 40, 217];
            } else if (status === 'absent') {
              data.cell.styles.fillColor = [253, 242, 248];
              data.cell.styles.textColor = [190, 18, 60];
            } else if (status.includes('half')) {
              data.cell.styles.fillColor = [245, 243, 255];
              data.cell.styles.textColor = [109, 40, 217];
            }
          }
        }
      });
      
      doc.save(`attendance-report-${today}.pdf`);
      showToast('success', 'PDF exported successfully!');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      showToast('error', `Failed to export PDF: ${err.message}`);
    }
  }, [filteredData, summary, showToast, today]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    try {
      showToast('info', 'Preparing CSV export...');
      
      const headers = ['Employee ID', 'Name', 'Department', 'Position', 'Status'];
      const csvContent = [
        headers.join(','),
        ...filteredData.map(item => [
          item.employeeId,
          `"${item.employeeName.replace(/"/g, '""')}"`,
          `"${item.department.replace(/"/g, '""')}"`,
          `"${item.position.replace(/"/g, '""')}"`,
          item.status
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `attendance-${today}.csv`;
      link.click();
      
      showToast('success', 'CSV exported successfully!');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      showToast('error', `Failed to export CSV: ${err.message}`);
    }
  }, [filteredData, showToast, today]);

  // Navigation handlers
  const handleLogoClick = useCallback(() => {
    navigate('/attendance');
  }, [navigate]);

  const goToBulkAttendance = useCallback(() => {
    navigate('/bulk-attendance');
  }, [navigate]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  // Status badge colors
  const statusColors = useMemo(() => ({
    present: "bg-purple-100 text-purple-800",
    absent: "bg-pink-100 text-pink-800",
    'half-day': "bg-indigo-100 text-indigo-800"
  }), []);

  // Status icons
  const statusIcons = useMemo(() => ({
    present: <FaCheckCircle className="text-purple-500" />,
    absent: <FaTimesCircle className="text-pink-500" />,
    'half-day': <FaClock className="text-indigo-500" />
  }), []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        className="animate__animated animate__fadeIn"
      />
      
      {/* Fixed Header */}
      <nav className="fixed top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="absolute left-4 flex items-center">
              <div 
                className="flex items-center cursor-pointer group"
                onClick={handleLogoClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
              >
                <img 
                  className="h-10 w-auto max-h-[40px] transform transition-all duration-300 group-hover:scale-110"
                  src="/assets/logo.png" 
                  alt="Company Logo"
                  style={{
                    maxWidth: '150px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150x40?text=Logo';
                    e.target.className = 'h-10 w-auto max-h-[40px]';
                  }}
                  loading="lazy"
                />
                <span className="ml-2 text-xl font-bold text-white tracking-wide group-hover:text-opacity-80 transition-all duration-300">
                  {import.meta.env.VITE_COMPANY_NAME}
                </span>
              </div>
            </div>

            {/* Nav items */}
            <div className="absolute right-4 flex items-center space-x-4">
              <button 
                onClick={goToBulkAttendance}
                className="flex items-center px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                <FaUsers className="mr-1" />
                <span className="text-sm">Bulk Attendance</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Scroll buttons */}
      <button 
        onClick={scrollToBottom}
        className="fixed top-20 left-6 z-50 p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-110"
      >
        <FaArrowDown />
      </button>

      {/* Main content */}
      <div className="pt-24 max-w-6xl mx-auto py-8 px-6">
        <h1 className="text-3xl font-bold text-purple-900 text-center mb-6 uppercase tracking-wide">
          Employee Dashboard
        </h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <FaSpinner className="animate-spin text-purple-600 text-4xl mb-4" />
              <p className="text-purple-700 text-lg font-medium">Loading attendance data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Present Card */}
              <div className="bg-white p-4 rounded-lg shadow-md border border-purple-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                    <FaCheckCircle className="text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-500">Present</p>
                    <p className="text-2xl font-bold text-purple-800">
                      {summary.present}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Absent Card */}
              <div className="bg-white p-4 rounded-lg shadow-md border border-pink-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-pink-100 text-pink-600 mr-4">
                    <FaTimesCircle className="text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Absent</p>
                    <p className="text-2xl font-bold text-pink-800">
                      {summary.absent}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Half Day Card */}
              <div className="bg-white p-4 rounded-lg shadow-md border border-indigo-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
                    <FaClock className="text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-indigo-500">Half Day</p>
                    <p className="text-2xl font-bold text-indigo-800">
                      {summary.halfDay}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Total Card */}
              <div className="bg-white p-4 rounded-lg shadow-md border border-purple-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                    <FaUsers className="text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-500">Total Employees</p>
                    <p className="text-2xl font-bold text-purple-800">
                      {summary.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Export */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 transform transition-all duration-300 hover:shadow-lg border border-purple-100">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div className="relative w-full md:max-w-md">
                  <input
                    type="text"
                    placeholder="Search employees..."
                    className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300 text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch className="absolute left-3 top-4 text-purple-400 text-lg" />
                </div>
                
                <div className="flex items-center gap-3">
                  <select 
                    className="border border-purple-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all duration-300 text-lg"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="half-day">Half Day</option>
                  </select>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={exportToCSV}
                      className="flex items-center px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      <FaFileCsv className="mr-2" />
                      CSV
                    </button>
                    <button 
                      onClick={exportToPDF}
                      className="flex items-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      <FaFilePdf className="mr-2" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Chart */}
                <div className="w-full lg:w-1/3 bg-white p-4 rounded-lg shadow-md border border-purple-100">
                  <h2 className="text-xl font-semibold text-purple-800 mb-4 flex items-center">
                    <FaChartPie className="mr-2" />
                    Attendance Distribution
                  </h2>
                  <div 
                    ref={chartRef} 
                    style={{ width: '100%', height: '300px' }}
                  />
                </div>
                
                {/* Table */}
                <div className="w-full lg:w-2/3">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-purple-200">
                      <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Employee</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Department</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Position</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-purple-100">
                        {filteredData.length > 0 ? (
                          filteredData.map((employee) => (
                            <tr key={employee.employeeId} className="hover:bg-purple-50 transition-colors duration-300">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <FaUserCircle className="w-10 h-10 rounded-full mr-4 text-purple-400" />
                                  <div>
                                    <div className="text-lg font-medium text-purple-900">{employee.employeeName}</div>
                                    <div className="text-base text-purple-500">ID: {employee.employeeId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-lg text-purple-900">
                                {employee.department}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-lg text-purple-900">
                                {employee.position}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="mr-2">
                                    {statusIcons[employee.status]}
                                  </span>
                                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[employee.status]}`}>
                                    {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="px-6 py-4 text-center text-lg text-purple-500">
                              No employees found matching your criteria
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <button 
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-50 p-4 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-110"
      >
        <FaArrowUp className="text-lg" />
      </button>
    </div>
  );
};

export default EmployeeDashboard;