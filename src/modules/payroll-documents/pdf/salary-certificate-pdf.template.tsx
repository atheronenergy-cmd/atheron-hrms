import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { SalaryCertificateRenderData } from "@/modules/payroll-documents/domain/types";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.5 },
  title: { fontSize: 18, textAlign: "center", marginBottom: 24, color: "#1e3a8a", fontWeight: "bold" },
  body: { marginVertical: 16 },
  signature: { marginTop: 48 },
});

export function SalaryCertificatePdfDocument({ data }: { data: SalaryCertificateRenderData }) {
  return (
    <Document title={`Salary Certificate ${data.documentNumber}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Salary Certificate</Text>
        <Text>Document No: {data.documentNumber}</Text>
        <View style={styles.body}>
          <Text>
            This is to certify that {data.employeeName} (Employee Code: {data.employeeCode}) is employed with
            {" "}{data.companyName} as {data.designation} in the {data.department} department since {data.joiningDate}.
          </Text>
          <Text style={{ marginTop: 12 }}>
            Current monthly salary: ₹{data.currentSalary.toLocaleString("en-IN")}. Gross salary: ₹{data.grossSalary.toLocaleString("en-IN")}.
          </Text>
          <Text style={{ marginTop: 12 }}>Issued on {data.issuedDate} for official purposes.</Text>
        </View>
        <View style={styles.signature}>
          <Text>Authorized Signatory</Text>
          <Text>{data.authorizedSignatory}</Text>
        </View>
        {data.verificationHash ? <Text style={{ marginTop: 24, fontSize: 9 }}>Verification Hash: {data.verificationHash.slice(0, 24)}</Text> : null}
      </Page>
    </Document>
  );
}
