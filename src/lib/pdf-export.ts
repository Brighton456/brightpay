import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
  id: string;
  external_reference?: string;
  type: string;
  amount: number;
  phone?: string;
  status: string;
  created_at: string;
  mpesa_receipt?: string;
}

export function exportTransactionsPDF(transactions: Transaction[], userName?: string) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(14, 165, 233); // primary blue
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("BrightPay", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Transaction Report", 14, 26);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 33);
  if (userName) {
    doc.text(`Account: ${userName}`, 120, 26);
  }
  doc.text(`Total Records: ${transactions.length}`, 120, 33);

  // Summary stats
  const completed = transactions.filter((t) => t.status === "completed");
  const totalDeposits = completed.filter((t) => t.type === "deposit" || t.type === "endpoint").reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = completed.filter((t) => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);
  const successRate = transactions.length > 0 ? Math.round((completed.length / transactions.length) * 100) : 0;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, 52);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const summaryY = 58;
  const col1 = 14, col2 = 75, col3 = 136;

  doc.setTextColor(100);
  doc.text("Total Deposits", col1, summaryY);
  doc.text("Total Withdrawals", col2, summaryY);
  doc.text("Completed", col3, summaryY);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text(`KES ${totalDeposits.toLocaleString()}`, col1, summaryY + 5);
  doc.text(`KES ${totalWithdrawals.toLocaleString()}`, col2, summaryY + 5);
  doc.text(`${completed.length.toLocaleString()}`, col3, summaryY + 5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Success Rate", col1, summaryY + 14);
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.text(`${successRate}%`, col1, summaryY + 19);

  // Divider
  doc.setDrawColor(220);
  doc.line(14, summaryY + 24, 196, summaryY + 24);

  // Table
  const tableData = transactions.map((tx) => [
    new Date(tx.created_at).toLocaleDateString(),
    tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
    tx.external_reference || tx.id.slice(0, 8),
    tx.phone || "-",
    `KES ${Number(tx.amount).toLocaleString()}`,
    tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
    tx.mpesa_receipt || "-",
  ]);

  autoTable(doc, {
    startY: summaryY + 28,
    head: [["Date", "Type", "Reference", "Phone", "Amount", "Status", "Receipt"]],
    body: tableData,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right" },
    },
    didParseCell: (data: any) => {
      if (data.column.index === 5 && data.section === "body") {
        const val = data.cell.raw as string;
        if (val === "Completed") data.cell.styles.textColor = [16, 185, 129];
        else if (val === "Failed") data.cell.styles.textColor = [239, 68, 68];
        else if (val === "Pending") data.cell.styles.textColor = [245, 158, 11];
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`BrightPay • Page ${i} of ${pageCount}`, 14, 290);
    doc.text("Confidential", 180, 290);
  }

  doc.save("brightpay-transactions.pdf");
}
