import React, { useState, useEffect, useMemo } from "react";
import { 
  FaSearch, 
  FaUserCircle, 
  FaSpinner,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaFilePdf,
  FaFileCsv
} from "react-icons/fa";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const EmployeeDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDateWarning, setShowDateWarning] = useState(false);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isDateValid = useMemo(() => selectedDate <= today, [selectedDate, today]);

  const showToast = (type, message) => {
    toast[type](message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const showDateWarningNotification = () => {
    showToast('error', 'Cannot view attendance for future dates. Please select today or a past date.');
    setShowDateWarning(true);
    setTimeout(() => setShowDateWarning(false), 3000);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    
    if (newDate > today) {
      showDateWarningNotification();
    } else {
      fetchAttendanceData(newDate);
    }
  };

  const fetchAttendanceData = async (date) => {
    try {
      setIsLoading(true);
      // Corrected endpoint URL (removed /employees prefix)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/attendance-status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setEmployees(data.attendanceRecords || []);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      showToast('error', 'Failed to load attendance data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData(selectedDate);
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    
    const searchLower = search.toLowerCase();
    return employees.filter(emp => 
      emp.employeeName.toLowerCase().includes(searchLower) ||
      emp.employeeId.toString().includes(search)
    );
  }, [employees, search]);

  const statusColors = {
    present: "bg-green-100 text-green-800",
    absent: "bg-red-100 text-red-800",
    halfday: "bg-yellow-100 text-yellow-800",
    "not-marked": "bg-gray-100 text-gray-800"
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(63, 81, 181);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Employee Attendance Report', 105, 20, { align: 'center' });
    
    // Date information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Report Date: ${new Date(selectedDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, 14, 40);
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 14, 47);
    
    // Table data
    const headers = [['ID', 'Employee Name', 'Status']];
    const rows = filteredEmployees.map(emp => [
      emp.employeeId,
      emp.employeeName,
      emp.status.replace('-', ' ')
    ]);
    
    // Add table
    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 60,
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255]
      },
      didParseCell: (data) => {
        if (data.column.index === 2) { // Status column
          const status = data.cell.raw.toLowerCase();
          if (status.includes('present')) {
            data.cell.styles.fillColor = [224, 242, 254];
            data.cell.styles.textColor = [3, 105, 161];
          } else if (status.includes('absent')) {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [185, 28, 28];
          } else if (status.includes('halfday')) {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [146, 64, 14];
          }
        }
      }
    });
    
    doc.save(`employee-attendance-${selectedDate}.pdf`);
    showToast('success', 'PDF exported successfully!');
  };

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Name', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map(emp => [
        emp.employeeId,
        `"${emp.employeeName.replace(/"/g, '""')}"`,
        emp.status.replace('-', ' ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employee-attendance-${selectedDate}.csv`;
    link.click();
    showToast('success', 'CSV exported successfully!');
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <ToastContainer />
      
      <button 
        onClick={scrollToBottom}
        className="fixed top-20 left-6 z-50 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-110"
      >
        <FaArrowDown />
      </button>

      <div className="pt-24 max-w-6xl mx-auto py-8 px-6">
        <h1 className="text-3xl font-bold text-blue-900 text-center mb-6 uppercase tracking-wide">
          Employee Attendance Dashboard
        </h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <FaSpinner className="animate-spin text-blue-600 text-4xl mb-4" />
              <p className="text-blue-700 text-lg font-medium">Loading attendance data...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <div className="relative w-full md:max-w-md">
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-300 text-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <FaSearch className="absolute left-3 top-4 text-blue-400 text-lg" />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input 
                    type="date" 
                    className={`border ${isDateValid ? 'border-blue-200' : 'border-red-400'} rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 bg-white text-lg pr-10`}
                    value={selectedDate}
                    onChange={handleDateChange}
                    max={today}
                  />
                  <FaCalendarAlt className={`absolute right-3 top-4 text-lg ${isDateValid ? 'text-blue-400' : 'text-red-500'}`} />
                  {!isDateValid && (
                    <div className="absolute -bottom-6 left-0 text-red-500 text-sm font-medium flex items-center">
                      <span>Cannot view future dates</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={exportToCSV}
                    className="flex items-center px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg shadow hover:from-green-700 hover:to-green-800 transition-all duration-300"
                    title="Export to CSV"
                  >
                    <FaFileCsv className="mr-2" />
                    CSV
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg shadow hover:from-red-700 hover:to-red-800 transition-all duration-300"
                    title="Export to PDF"
                  >
                    <FaFilePdf className="mr-2" />
                    PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6 transform transition-all duration-300 hover:shadow-lg border border-blue-100">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-blue-800">
                  Attendance for {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
                <p className="text-blue-600">
                  Showing {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-200">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      <th className="px-8 py-4 text-left text-sm font-medium text-blue-800 uppercase tracking-wider">Employee ID</th>
                      <th className="px-8 py-4 text-left text-sm font-medium text-blue-800 uppercase tracking-wider">Name</th>
                      <th className="px-8 py-4 text-left text-sm font-medium text-blue-800 uppercase tracking-wider">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-blue-100">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => (
                        <tr key={emp.employeeId} className="hover:bg-blue-50 transition-colors duration-300">
                          <td className="px-8 py-5 whitespace-nowrap text-lg text-blue-900 font-medium">{emp.employeeId}</td>
                          <td className="px-8 py-5 whitespace-nowrap">
                            <div className="flex items-center">
                              <FaUserCircle className="w-10 h-10 rounded-full mr-4 text-blue-400" />
                              <div>
                                <div className="text-lg font-medium text-blue-900">{emp.employeeName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap text-lg">
                            <span className={`px-3 py-2 text-sm font-semibold rounded-full ${statusColors[emp.status]}`}>
                              {emp.status.replace('-', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-center text-lg text-blue-500">
                          No attendance records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <button 
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-110"
      >
        <FaArrowUp className="text-lg" />
      </button>
    </div>
  );
};

export default EmployeeDashboard;