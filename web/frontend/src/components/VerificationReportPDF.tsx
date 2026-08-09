import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 50,
    fontSize: 10,
    color: '#1a1a1a',
    position: 'relative',
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    fontSize: 72,
    color: '#e5e7eb',
    transform: 'rotate(-30deg)',
    fontWeight: 700,
    opacity: 0.5,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orgName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1e40af',
  },
  orgDetails: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'right',
    lineHeight: 1.5,
  },
  date: {
    fontSize: 10,
    color: '#374151',
    marginTop: 8,
  },
  addressBlock: {
    marginBottom: 20,
    lineHeight: 1.6,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  table: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowShaded: {
    backgroundColor: '#f9fafb',
  },
  tableLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: 600,
    color: '#374151',
  },
  tableValue: {
    flex: 2,
    fontSize: 9,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  tableValueMono: {
    flex: 2,
    fontSize: 8,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  balanceHighlight: {
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1e40af',
  },
  balanceLabel: {
    fontSize: 9,
    color: '#1e40af',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tokenTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tokenTableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
  },
  tokenRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tokenCell: {
    fontSize: 8,
    color: '#1a1a1a',
  },
  evidenceBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
    lineHeight: 1.5,
  },
  disclaimer: {
    fontSize: 8,
    color: '#6b7280',
    lineHeight: 1.5,
    marginTop: 16,
    fontStyle: 'italic',
  },
})

export interface VerificationReportData {
  userId: string
  balance: string
  tokensExpected: number
  tokensFound: number
  allIncluded: boolean
  foundRecords: { uuid: string; token: string; value: string }[]
  totalLiabilities: string
  merkleRoot: string
  proofId: string
  verifiers: { name: string; timestamp: string }[]
  reserveAddress: string
  timestamp: string
}

interface Props {
  data: VerificationReportData
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
}

const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export const VerificationReportPDF = ({ data }: Props) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Watermark */}
      <Text style={styles.watermark}>DEMO</Text>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.orgName}>LPOR</Text>
            <Text style={{ fontSize: 9, color: '#6b7280' }}>Layered Proof of Reserves Framework</Text>
          </View>
          <View>
            <Text style={styles.orgDetails}>LPOR Verification Services</Text>
            <Text style={styles.orgDetails}>Reference Implementation</Text>
            <Text style={styles.orgDetails}>github.com/donggookim/lpor-reference-implementation</Text>
          </View>
        </View>
        <Text style={styles.date}>{formatDateShort(data.timestamp)}</Text>
      </View>

      {/* Address Block */}
      <View style={styles.addressBlock}>
        <Text style={styles.bodyText}>To Whom It May Concern,</Text>
        <Text style={styles.bodyText}>Counterparty & Compliance Team,</Text>
        <Text style={styles.bodyText}>Digital Asset Balance Verification Request</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>Public Liability Ledger Inclusion Verification Report</Text>

      {/* Description */}
      <Text style={styles.bodyText}>
        This report documents the cryptographic verification of a user's balance inclusion in the
        Public Liability Ledger (PLL) for proof epoch {data.proofId}.
      </Text>
      <Text style={styles.bodyText}>
        The verification was performed under the LPOR (Layered Proof of Reserves) framework,
        a layered verification protocol that separates lightweight user-side checks from
        auditor-level cryptographic verification. LPOR enables non-technical users to verify
        their balance inclusion and publicly recompute total liabilities with minimal friction,
        while independent auditors confirm the cryptographic binding between the PLL and the
        published Merkle commitment.
      </Text>
      <Text style={styles.bodyText}>
        The procedures performed constitute agreed-upon verification steps within the LPOR protocol.
        No opinion is expressed regarding continuous holdings after the verified snapshot.
      </Text>

      {/* Balance */}
      <View style={styles.balanceHighlight}>
        <Text style={styles.balanceLabel}>Verified Included Balance</Text>
        <Text style={styles.balanceValue}>{data.balance} BTC</Text>
      </View>

      {/* Verification Details */}
      <Text style={styles.sectionTitle}>Verification Details</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableRowShaded]}>
          <Text style={styles.tableLabel}>Report User ID</Text>
          <Text style={styles.tableValueMono}>{data.userId}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Proof Epoch</Text>
          <Text style={styles.tableValue}>{data.proofId}</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowShaded]}>
          <Text style={styles.tableLabel}>Tokens Expected / Found</Text>
          <Text style={styles.tableValue}>{data.tokensFound} / {data.tokensExpected}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Inclusion Status</Text>
          <Text style={[styles.tableValue, { color: data.allIncluded ? '#16a34a' : '#dc2626', fontWeight: 700 }]}>
            {data.allIncluded ? 'VERIFIED — All tokens included' : 'FAILED — Tokens missing'}
          </Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowShaded]}>
          <Text style={styles.tableLabel}>Total Liabilities (PLL Sum)</Text>
          <Text style={styles.tableValue}>{data.totalLiabilities} BTC</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>Merkle Root Commitment</Text>
          <Text style={styles.tableValueMono}>{data.merkleRoot.slice(0, 40)}...</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowShaded]}>
          <Text style={styles.tableLabel}>Exchange Reserve Address</Text>
          <Text style={styles.tableValueMono}>{data.reserveAddress}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableLabel}>PLL Data URL</Text>
          <Link src="https://lpor-demo.example.com/api/pll/download">
            <Text style={[styles.tableValue, { color: '#1e40af', textDecoration: 'underline' }]}>
              https://lpor-demo.example.com/api/pll/download
            </Text>
          </Link>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast, styles.tableRowShaded]}>
          <Text style={styles.tableLabel}>Verification Timestamp</Text>
          <Text style={styles.tableValue}>{formatDate(data.timestamp)}</Text>
        </View>
      </View>

      {/* Token List */}
      <Text style={styles.sectionTitle}>Verified Token Records in PLL</Text>
      <View style={styles.table}>
        <View style={styles.tokenTableHeader}>
          <Text style={[styles.tokenTableHeaderText, { flex: 1 }]}>#</Text>
          <Text style={[styles.tokenTableHeaderText, { flex: 4 }]}>UUID</Text>
          <Text style={[styles.tokenTableHeaderText, { flex: 2 }]}>Token</Text>
          <Text style={[styles.tokenTableHeaderText, { flex: 1, textAlign: 'right' }]}>Value</Text>
        </View>
        {data.foundRecords.slice(0, 15).map((r, i) => (
          <View key={i} style={[styles.tokenRow, i % 2 === 0 ? styles.tableRowShaded : {}]}>
            <Text style={[styles.tokenCell, { flex: 1 }]}>{i + 1}</Text>
            <Text style={[styles.tokenCell, { flex: 4 }]}>{r.uuid.slice(0, 28)}...</Text>
            <Text style={[styles.tokenCell, { flex: 2 }]}>{r.token}</Text>
            <Text style={[styles.tokenCell, { flex: 1, textAlign: 'right' }]}>{r.value}</Text>
          </View>
        ))}
      </View>

      {/* Independent Verification Evidence */}
      <Text style={styles.sectionTitle}>Independent Verification Evidence</Text>
      <View style={styles.evidenceBox}>
        <Text style={{ fontSize: 9, fontWeight: 600, color: '#166534', marginBottom: 6 }}>
          The following independent parties have verified the Merkle commitment binding:
        </Text>
        {data.verifiers.map((v, i) => (
          <Text key={i} style={{ fontSize: 9, color: '#166534', marginBottom: 3 }}>
            {i + 1}. {v.name} — verified at {formatDate(v.timestamp)}
          </Text>
        ))}
      </View>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        Scope note: Verification is snapshot-specific (epoch {data.proofId}) and does not represent
        continuous holdings or custody assurance after the verified snapshot. This document may be
        independently validated using the PLL data URL and the published Merkle root.
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Prepared by: LPOR Reference Implementation
        </Text>
        <Text style={styles.footerText}>
          Generated: {new Date(data.timestamp).toISOString()} | Protocol: LPOR v1.0
        </Text>
        <Link src="https://github.com/donggookim/lpor-reference-implementation">
          <Text style={[styles.footerText, { color: '#1e40af' }]}>
            https://github.com/donggookim/lpor-reference-implementation
          </Text>
        </Link>
      </View>
    </Page>
  </Document>
)

export default VerificationReportPDF
