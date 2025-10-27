import React, { useState } from 'react';
import { Upload, FileText, Loader } from 'lucide-react';
import * as XLSX from 'xlsx'; // Import the new library
import './BulkUploadForm.css';

const BulkUploadForm = ({ onBulkAdd }) => {
    const [fileName, setFileName] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setError(null);
        setIsLoading(true);

        // --- Clean filename for batch ---
        const batchName = file.name.replace(/\.(xlsx|csv)$/i, '').replace(/_/g, ' ');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // --- This converts the sheet to JSON ---
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    throw new Error("File is empty or headers are missing.");
                }
                
                // --- Map and validate data ---
                const parsedEmployees = json.map((row, index) => {
                    // Normalize headers (e.g., "Payee Name" or "name" -> "name")
                    const normalizedRow = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[key.toLowerCase().replace(/ /g, '')] = row[key];
                    });

                    const name = normalizedRow['name'] || normalizedRow['payeename'];
                    const salary = parseFloat(normalizedRow['salaryamount']);
                    const bank = normalizedRow['bankdetails'] || normalizedRow['beneficiarydetails'];

                    if (!name || !salary || !bank) {
                        throw new Error(`Row ${index + 2}: Missing required fields (Name, SalaryAmount, BankDetails)`);
                    }
                    if (isNaN(salary) || salary <= 0) {
                        throw new Error(`Row ${index + 2}: SalaryAmount must be a positive number.`);
                    }

                    return {
                        name: name,
                        salaryAmount: salary,
                        bankDetails: bank,
                        paymentRef: normalizedRow['paymentreference'] || '',
                        yourRef: normalizedRow['yourreference'] || '',
                        notes: normalizedRow['notes'] || '',
                    };
                });

                // --- Pass data up to the dashboard ---
                onBulkAdd(parsedEmployees, batchName);
                setIsLoading(false);
                setFileName(null); // Reset after success
            } catch (err) {
                console.error("File parsing error:", err);
                setError(err.message || "Failed to parse file. Please check format.");
                setIsLoading(false);
            }
        };

        reader.onerror = () => {
            setError("Failed to read file.");
            setIsLoading(false);
        };

        reader.readAsArrayBuffer(file);
        e.target.value = null; // Reset file input
    };

    return (
        <div className="bulkUploadCard">
            <h3 className="formTitle">Bulk Upload Employees</h3>
            <p className="uploadHelpText">
                Upload an Excel (.xlsx) or CSV (.csv) file. A new batch will be created named after the file.
            </p>
            
            <input
                type="file"
                id="fileUpload"
                className="fileInput"
                accept=".xlsx, .csv"
                onChange={handleFileChange}
                disabled={isLoading}
            />
            <label htmlFor="fileUpload" className={`button fileInputLabel ${isLoading ? 'disabled' : ''}`}>
                {isLoading ? <Loader className="loader" /> : <Upload />}
                {isLoading ? 'Processing...' : (fileName || 'Choose a file...')}
            </label>

            {error && <p className="errorText">{error}</p>}
            
            <div className="formatInfo">
                <p><FileText /> <b>Required File Format:</b></p>
                <p>The first row must be headers. Required headers are:</p>
                <ul>
                    <li><b>name</b> (or "Payee Name")</li>
                    <li><b>salaryAmount</b></li>
                    <li><b>bankDetails</b> (or "Beneficiary Details")</li>
                </ul>
                <p>Optional headers: <b>paymentRef</b>, <b>yourRef</b>, <b>notes</b></p>
            </div>
        </div>
    );
};

export default BulkUploadForm;