import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import RegisterDoctor from './pages/RegisterDoctor';
import AdminDashboard from './pages/AdminDashboard';
import AdminPayouts from './pages/AdminPayouts';
import AdminDoctorPayoutDetails from './pages/AdminDoctorPayoutDetails';
import AdminOverview from './pages/AdminOverview';
import AdminUpload from './pages/AdminUpload';
import AdminDoctors from './pages/AdminDoctors';
import CenterUpload from './pages/CenterUpload';
import CenterCases from './pages/CenterCases';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorOpenPool from './pages/DoctorOpenPool';
import DoctorCompletedReports from './pages/DoctorCompletedReports';
import DoctorWorkspace from './pages/DoctorWorkspace';
import Layout from './components/Layout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register/doctor" element={<RegisterDoctor />} />
        
        {/* Diagnostic Center Routes wrapped in Layout */}
        <Route path="/center" element={<Layout role="center"><CenterUpload /></Layout>} />
        <Route path="/center/upload" element={<Layout role="center"><CenterUpload /></Layout>} />
        <Route path="/center/cases" element={<Layout role="center"><CenterCases /></Layout>} />

        {/* Admin Routes wrapped in Layout */}
        <Route path="/admin" element={<Layout role="admin"><AdminOverview /></Layout>} />
        <Route path="/admin-upload" element={<Layout role="admin"><AdminUpload /></Layout>} />
        <Route path="/admin-doctors" element={<Layout role="admin"><AdminDoctors /></Layout>} />
        <Route path="/admin-approvals" element={<Layout role="admin"><AdminDashboard /></Layout>} />
        <Route path="/admin-payouts" element={<Layout role="admin"><AdminPayouts /></Layout>} />
        <Route path="/admin-payouts/:doctorId" element={<Layout role="admin"><AdminDoctorPayoutDetails /></Layout>} />
        
        {/* Doctor Routes wrapped in Layout */}
        <Route path="/doctor" element={<Layout role="doctor"><DoctorDashboard /></Layout>} />
        <Route path="/doctor/open-pool" element={<Layout role="doctor"><DoctorOpenPool /></Layout>} />
        <Route path="/doctor/completed-reports" element={<Layout role="doctor"><DoctorCompletedReports /></Layout>} />
        <Route path="/doctor/workspace/:id" element={<Layout role="doctor"><DoctorWorkspace /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
