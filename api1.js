import React, { useState, useEffect, useMemo } from "react";
import LandingPage from "./aaaaa/LandingPage";
import AccountHeader from "./aaaaa/AccountHeader";
import TransactionHistory from "./aaaaa/TransactionHistory";

// Import your new apiFetch function
// (You may need to adjust the path to './api.js' or './utils/api.js')
import { getBankAccounts, getBatches, getEmployees } from "./api";

export default function App() {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [currency, setCurrency] = useState("INR");

  // --- Backend Data State ---
  const [profiles, setProfiles] = useState([]); // From /api/bank-accounts
  const [batches, setBatches] = useState([]); // From /api/batches
  const [employees, setEmployees] = useState([]); // From /api/employees
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Data Fetching ---
  useEffect(() => {
    // Fetch all required data from the backend when the app loads
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Use specific API functions from your api.js
        const [accountsData, batchesData, employeesData] = await Promise.all([
          getBankAccounts(),
          getBatches(),
          getEmployees(),
        ]);

        // The .ok checks and .json() calls are no longer needed,
        // as your handleResponse function in api.js takes care of it.

        // 1. Set profiles from bank accounts.
        const profileData = accountsData.map((acc) => ({
          id: acc.id,
          name: acc.accountName,
          accountNumber: acc.accountNumber,
          balance: acc.balance,
          initialBalance: acc.balance, // Using balance as initialBalance
          currency: "USD", // Assuming default currency, you can change this
          transactions: [], // This will be calculated dynamically
        }));
        
        setProfiles(profileData);
        setBatches(batchesData);
        setEmployees(employeesData);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []); // Empty array means this runs once on component mount

  // --- Transaction Calculation ---
  // This hook calculates the transaction list for the selected account.
  // It re-runs only when the selected account, batches, or employees change.
  const transactionsForSelectedAccount = useMemo(() => {
    if (!selectedAccount) {
      return [];
    }

    // 1. Calculate the total salary for each batch
    const salaryTotalsByBatchId = employees.reduce((acc, employee) => {
      if (employee.batchId) {
        if (!acc[employee.batchId]) {
          acc[employee.batchId] = 0;
        }
        acc[employee.batchId] += employee.salaryAmount;
      }
      return acc;
    }, {});

    // 2. Filter batches that belong to the selected account
    const relevantBatches = batches.filter(
      (batch) => batch.debitAccount === selectedAccount.accountNumber
    );

    // 3. Map batches to the format TransactionHistory expects
    const formattedTransactions = relevantBatches
      .filter(batch => batch.lastPaymentDate) // Only show batches that have been paid
      .map((batch) => ({
        date: batch.lastPaymentDate.split("T")[0], // Format date as YYYY-MM-DD
        id: `BAT-${batch.id}`, // Use batch ID as the Transaction ID
        description: batch.name, // Use batch name for description
        amount: salaryTotalsByBatchId[batch.id] || 0, // Get the calculated sum
        approver: batch.userId || "N/A", // Use userId as the approver
      }));

    return formattedTransactions;
  }, [selectedAccount, batches, employees]);

  // --- Render Logic ---

  if (loading) {
    return <div>Loading Account Data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!selectedAccount) {
    return (
      <LandingPage
        profiles={profiles}
        onSelectProfile={(acc) => {
          setSelectedAccount(acc);
          setCurrency(acc.currency);
        }}
      />
    );
  }

  // Once an account is selected, render the account details
  return (
    <div>
      <AccountHeader
        name={selectedAccount.name}
        accountNumber={selectedAccount.accountNumber}
        balance={selectedAccount.balance}
        currency={currency}
        onCurrencyChange={setCurrency}
      />
      <TransactionHistory
        // Pass the dynamically calculated transactions
        transactions={transactionsForSelectedAccount}
        accountBalance={selectedAccount.balance}
        initialBalance={selectedAccount.initialBalance}
        currency={currency}
      />
    </div>
  );
}

