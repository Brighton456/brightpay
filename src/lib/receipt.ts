import jsPDF from "jspdf";

interface ReceiptData {
  id: string;
  type: string;
  amount: number;
  fee?: number;
  status: string;
  phone?: string;
  external_reference?: string;
  created_at: string;
  wallet_type?: string;
  full_name?: string;
}

export function generateReceipt(tx: ReceiptData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("BrightPay", 20, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Payment Receipt", 20, 28);
  doc.text(new Date(tx.created_at).toLocaleDateString("en-KE", { dateStyle: "long" }), 20, 35);

  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    completed: [16, 185, 129],
    pending: [245, 158, 11],
    failed: [239, 68, 68],
  };
  const sc = statusColors[tx.status] || [107, 114, 128];
  doc.setFillColor(sc[0], sc[1], sc[2]);
  doc.roundedRect(pageWidth - 50, 12, 30, 10, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(tx.status.toUpperCase(), pageWidth - 35, 19, { align: "center" });

  // Receipt body
  doc.setTextColor(30, 30, 30);
  const startY = 55;

  const rows: [string, string][] = [
    ["Transaction ID", tx.id.slice(0, 12) + "..."],
    ["Type", tx.type.charAt(0).toUpperCase() + tx.type.slice(1)],
    ["Amount", `KES ${Number(tx.amount).toLocaleString()}`],
  ];
  if (tx.fee) rows.push(["Fee", `KES ${Number(tx.fee).toLocaleString()}`]);
  if (tx.phone) rows.push(["Phone", tx.phone]);
  if (tx.external_reference) rows.push(["Reference", tx.external_reference]);
  if (tx.wallet_type) rows.push(["Wallet", tx.wallet_type.charAt(0).toUpperCase() + tx.wallet_type.slice(1)]);
  if (tx.full_name) rows.push(["Account Holder", tx.full_name]);
  rows.push(["Date & Time", new Date(tx.created_at).toLocaleString("en-KE")]);

  doc.setFontSize(10);
  rows.forEach((row, i) => {
    const y = startY + i * 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(row[0], 20, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(row[1], 100, y);

    // Divider
    doc.setDrawColor(230, 230, 230);
    doc.line(20, y + 4, pageWidth - 20, y + 4);
  });

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("This is an auto-generated receipt from BrightPay.", pageWidth / 2, 270, { align: "center" });
  doc.text("https://brightpay.ddns.net", pageWidth / 2, 276, { align: "center" });

  doc.save(`BrightPay-Receipt-${tx.id.slice(0, 8)}.pdf`);
}
