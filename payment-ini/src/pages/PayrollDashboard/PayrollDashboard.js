import React, { useState, useCallback, useMemo } from 'react';
import { initialBatches, initialEmployees, mockBankAccounts } from '../../data/mockData';
import { generateId } from '../../utils/generateId';
import './PayrollDashboard.css';

// Import All Components
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import ErrorState from '../../components/ui/ErrorState/ErrorState';
import Header from '../../components/ui/Header/Header';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import EditBatchModal from '../../components/ui/EditBatchModal/EditBatchModal';
import AddItemForm from '../../components/forms/AddItemForm/AddItemForm';
import BulkUploadForm from '../../components/forms/BulkUploadForm/BulkUploadForm';
import AddEmployeeForm from '../../components/forms/AddEmployeeForm/AddEmployeeForm';
import EmployeeList from '../../components/views/EmployeeList/EmployeeList';
import BatchList from '../../components/views/BatchList/BatchList';
import InitiatePaymentModal from '../../components/payment/InitiatePaymentModal/InitiatePaymentModal';


const PayrollDashboard = () => {
    const [batches, setBatches] = useState(initialBatches);
    const [employees, setEmployees] = useState(initialEmployees);
    const [loading] = useState(false);
    const [error, setError] = useState(null);
    const [modalState, setModalState] = useState({ isOpen: false, data: null, type: null, title: '', message: '' });

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

    // Edit Modal State
    const [editModalState, setEditModalState] = useState({ isOpen: false, batch: null });

    // --- CRUD Operations ---

    const addBatch = useCallback((name) => {
        const newBatch = { id: generateId(), name, paymentCount: 0, lastPaymentDate: null, paymentStatus: 'Draft' };
        setBatches(prev => [newBatch, ...prev]);
    }, []);

    const addEmployee = useCallback((employeeData) => {
        const newEmployee = { 
            id: generateId(), 
            ...employeeData, 
            batchId: employeeData.batchId || null, 
        };
        setEmployees(prev => [newEmployee, ...prev]);
    }, []);
    
    const handleBulkAdd = useCallback((parsedEmployees, batchName) => {
        const newBatchId = generateId();
        const newBatch = {
            id: newBatchId,
            name: batchName,
            paymentCount: 0,
            lastPaymentDate: null,
            paymentStatus: 'Draft'
        };

        const newEmployees = parsedEmployees.map(emp => ({
            ...emp,
            id: generateId(),
            batchId: newBatchId
        }));

        setBatches(prev => [newBatch, ...prev]);
        setEmployees(prev => [...newEmployees, ...prev]);
        setError(null); // Clear any previous errors
    }, []);
    
    const assignEmployeeToBatch = useCallback((employeeId, batchId) => {
        setEmployees(prev => prev.map(emp => 
            emp.id === employeeId ? { ...emp, batchId: batchId } : emp
        ));
    }, []);

    // --- NEW FUNCTION ---
    const unassignEmployeeFromBatch = useCallback((employeeId) => {
        setEmployees(prev => prev.map(emp => 
            emp.id === employeeId ? { ...emp, batchId: null } : emp
        ));
    }, []);

    // --- Payment Handlers ---

    const initiatePayment = useCallback((batch) => {
        const batchEmployees = employees.filter(e => e.batchId === batch.id);
        if (batchEmployees.length === 0) {
            setError("Cannot initiate payment: No employees are assigned to this batch.");
            return;
        }
        setSelectedBatch(batch);
        setIsPaymentModalOpen(true);
        setError(null);
    }, [employees]);
    
    const handleConfirmInitiatePayment = useCallback((batch, paymentDetails) => {
        setIsPaymentProcessing(true);
        console.log("Submitting Payment:", paymentDetails);

        setTimeout(() => {
            setBatches(prevBatches => prevBatches.map(b => 
                b.id === batch.id ? { 
                    ...b, 
                    paymentCount: (b.paymentCount || 0) + 1, 
                    lastPaymentDate: new Date(), 
                    paymentStatus: 'Paid' 
                } : b
            ));
            
            setIsPaymentProcessing(false);
            setIsPaymentModalOpen(false);
            setSelectedBatch(null);
        }, 1500); 
    }, []);

    const handleDraftPayment = useCallback((batch, paymentDetails) => {
        console.log("Saving Draft:", paymentDetails);
        setIsPaymentModalOpen(false);
        setSelectedBatch(null);
        setError(null);
    }, []);

    // --- Delete Handlers ---

    const deleteBatch = useCallback((batch) => {
        const assignedCount = employees.filter(e => e.batchId === batch.id).length;
        setModalState({
            isOpen: true,
            type: 'delete_batch',
            data: batch,
            title: `Delete Batch: ${batch.name}`,
            message: `Are you sure you want to permanently delete the batch "${batch.name}"? This action will unassign ${assignedCount} employee(s).`
        });
    }, [employees]);

    const handleConfirmDeleteBatch = useCallback((batch) => {
        setBatches(prev => prev.filter(b => b.id !== batch.id));
        setEmployees(prev => prev.map(emp => 
            emp.batchId === batch.id ? { ...emp, batchId: null } : emp
        ));
        setModalState({ isOpen: false, data: null, type: null });
    }, []);


    const deleteEmployee = useCallback((employee) => {
        setModalState({
            isOpen: true,
            type: 'delete_employee',
            data: employee,
            title: `Delete Employee: ${employee.name}`,
            message: `Are you sure you want to permanently delete the employee "${employee.name}"? This cannot be undone.`
        });
    }, []);

    const handleConfirmDeleteEmployee = useCallback((employee) => {
        setEmployees(prev => prev.filter(emp => emp.id !== employee.id));
        setModalState({ isOpen: false, data: null, type: null });
    }, []);

    // --- Modal Close Handlers ---

    const handleModalConfirm = () => {
        if (!modalState.data || !modalState.type) return;
        if (modalState.type === 'delete_batch') {
            handleConfirmDeleteBatch(modalState.data);
        } else if (modalState.type === 'delete_employee') {
            handleConfirmDeleteEmployee(modalState.data);
        }
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, data: null, type: null, title: '', message: '' });
    };
    
    const handlePaymentModalClose = () => {
        setIsPaymentModalOpen(false);
        setSelectedBatch(null);
        setIsPaymentProcessing(false);
    };

    // --- Handlers for Edit Modal ---
    const handleOpenEditModal = useCallback((batch) => {
        setEditModalState({ isOpen: true, batch: batch });
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setEditModalState({ isOpen: false, batch: null });
    }, []);

    const handleConfirmEditBatch = useCallback((batchId, newName) => {
        setBatches(prev =>
            prev.map(batch =>
                batch.id === batchId ? { ...batch, name: newName } : batch
            )
        );
        handleCloseEditModal();
    }, [handleCloseEditModal]);

    
    if (loading) {
        return <LoadingState />;
    }
    
    return (
        <div className="dashboard">
            <Header />
            
            {error && <ErrorState message={error} />}

            <div className="formGrid">
                <AddItemForm 
                    placeholder="e.g., Q4 Marketing Team" 
                    buttonText="Add New Batch" 
                    onAdd={addBatch} 
                />
                
                <BulkUploadForm onBulkAdd={handleBulkAdd} />

                <AddEmployeeForm 
                    batches={batches}
                    onAdd={addEmployee} 
                />
            </div>

            <div className="mainContentGrid">
                <div className="employeeListColumn">
                    <EmployeeList 
                        employees={employees} 
                        deleteEmployee={deleteEmployee} 
                        batches={batches}
                    />
                </div>
                
                <div className="batchListColumn">
                    <BatchList 
                        batches={batches} 
                        employees={employees} 
                        deleteBatch={deleteBatch} 
                        assignEmployeeToBatch={assignEmployeeToBatch}
                        initiatePayment={initiatePayment} 
                        onEditBatch={handleOpenEditModal} 
                        unassignEmployee={unassignEmployeeFromBatch} 
                    />
                </div>
            </div>
            
            <ConfirmModal
                isOpen={modalState.isOpen}
                title={modalState.title}
                message={modalState.message}
                onConfirm={handleModalConfirm}
                onClose={handleModalClose}
            />
            
            <EditBatchModal
                isOpen={editModalState.isOpen}
                batch={editModalState.batch}
                onConfirm={handleConfirmEditBatch}
                onClose={handleCloseEditModal}
            />
            
            <InitiatePaymentModal
                isOpen={isPaymentModalOpen}
                batch={selectedBatch}
                employees={employees.filter(e => e.batchId === selectedBatch?.id)}
                bankAccounts={mockBankAccounts} 
                onConfirm={handleConfirmInitiatePayment}
                onDraft={handleDraftPayment}
                onClose={handlePaymentModalClose}
                isProcessing={isPaymentProcessing}
            />
        </div>
    );
};

export default PayrollDashboard;