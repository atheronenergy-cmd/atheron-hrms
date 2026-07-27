import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { PayslipRenderData } from "@/modules/payroll-documents/domain/types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  header: { borderBottom: "1 solid #2563eb", paddingBottom: 12, marginBottom: 16 },
  companyName: { fontSize: 16, fontWeight: "bold", color: "#1e3a8a" },
  subtitle: { fontSize: 9, color: "#64748b", marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginTop: 12, marginBottom: 6, color: "#1e40af" },
  tableHeader: { flexDirection: "row", backgroundColor: "#eff6ff", padding: 6 },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", padding: 6 },
  colName: { width: "65%" },
  colAmount: { width: "35%", textAlign: "right" },
  summaryBox: { marginTop: 16, padding: 12, backgroundColor: "#f8fafc", border: "1 solid #cbd5e1" },
  netPay: { fontSize: 14, fontWeight: "bold", color: "#15803d" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#64748b" },
});

function LineTable({ title, rows }: { title: string; rows: Array<{ name: string; amount: number }> }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.tableHeader}>
        <Text style={styles.colName}>Component</Text>
        <Text style={styles.colAmount}>Amount (INR)</Text>
      </View>
      {rows.map((row) => (
        <View key={`${title}-${row.name}`} style={styles.tableRow}>
          <Text style={styles.colName}>{row.name}</Text>
          <Text style={styles.colAmount}>{row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
        </View>
      ))}
    </View>
  );
}

export function PayslipPdfDocument({ data }: { data: PayslipRenderData }) {
  return (
    <Document title={`Payslip ${data.payslipNumber}`} author={data.company.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.company.legalName ?? data.company.name}</Text>
          <Text style={styles.subtitle}>Payslip · {data.period.name}</Text>
          <Text style={styles.subtitle}>Document No: {data.documentNumber}</Text>
        </View>

        <View style={styles.row}>
          <View>
            <Text>Employee: {data.employee.name}</Text>
            <Text>Code: {data.employee.code}</Text>
            <Text>Designation: {data.employee.designation}</Text>
            <Text>Department: {data.employee.department}</Text>
          </View>
          <View>
            <Text>Period: {data.period.startDate} to {data.period.endDate}</Text>
            <Text>Working Days: {data.workingDays}</Text>
            <Text>Paid Days: {data.paidDays}</Text>
            <Text>Payment Mode: {data.paymentMode ?? "Bank Transfer"}</Text>
          </View>
        </View>

        <LineTable title="Earnings" rows={data.earnings} />
        <LineTable title="Deductions" rows={data.deductions} />
        {data.employerContributions.length > 0 ? (
          <LineTable title="Employer Contributions" rows={data.employerContributions} />
        ) : null}

        <View style={styles.summaryBox}>
          <View style={styles.row}><Text>Gross Salary</Text><Text>₹{data.grossSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text></View>
          <View style={styles.row}><Text>Total Deductions</Text><Text>₹{data.totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text></View>
          <View style={styles.row}><Text style={styles.netPay}>Net Salary</Text><Text style={styles.netPay}>₹{data.netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text></View>
        </View>

        <Text style={styles.footer}>
          Generated on {data.generatedAt} · Verification: {data.verificationHash?.slice(0, 16) ?? "N/A"} · This is a system generated payslip.
        </Text>
      </Page>
    </Document>
  );
}
