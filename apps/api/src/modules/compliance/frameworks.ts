interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface ComplianceFramework {
  name: string;
  version: string;
  controls: ComplianceControl[];
}

export const COMPLIANCE_FRAMEWORKS: Record<string, ComplianceFramework> = {
  "eu-ai-act": {
    controls: [
      {
        category: "Governance",
        description: "Risk management system",
        id: "Art.9",
        name: "Risk Management"
      },
      {
        category: "Data",
        description: "Data and data governance",
        id: "Art.10",
        name: "Data Governance"
      },
      {
        category: "Documentation",
        description: "Technical documentation requirements",
        id: "Art.11",
        name: "Technical Documentation"
      },
      {
        category: "Operations",
        description: "Automatic logging",
        id: "Art.12",
        name: "Record Keeping"
      },
      {
        category: "Transparency",
        description: "Transparency and information",
        id: "Art.13",
        name: "Transparency"
      },
      {
        category: "Governance",
        description: "Human oversight measures",
        id: "Art.14",
        name: "Human Oversight"
      },
      {
        category: "Technical",
        description: "Accuracy, robustness, cybersecurity",
        id: "Art.15",
        name: "Accuracy & Robustness"
      }
    ],
    name: "EU AI Act",
    version: "2024"
  },
  gdpr: {
    controls: [
      {
        category: "Principles",
        description: "Lawfulness, fairness, transparency",
        id: "Art.5",
        name: "Data Processing Principles"
      },
      {
        category: "Principles",
        description: "Lawfulness of processing",
        id: "Art.6",
        name: "Lawful Basis"
      },
      {
        category: "Rights",
        description: "Right to be forgotten",
        id: "Art.17",
        name: "Right to Erasure"
      },
      {
        category: "Rights",
        description: "Right to data portability",
        id: "Art.20",
        name: "Data Portability"
      },
      {
        category: "Technical",
        description: "Data protection by design",
        id: "Art.25",
        name: "Privacy by Design"
      },
      {
        category: "Technical",
        description: "Appropriate technical measures",
        id: "Art.32",
        name: "Security of Processing"
      },
      {
        category: "Operations",
        description: "72-hour notification requirement",
        id: "Art.33",
        name: "Breach Notification"
      },
      {
        category: "Operations",
        description: "Data protection impact assessment",
        id: "Art.35",
        name: "Impact Assessment"
      },
      {
        category: "International",
        description: "Transfer restrictions",
        id: "Art.44",
        name: "Cross-border Transfers"
      }
    ],
    name: "GDPR",
    version: "2018"
  },
  hipaa: {
    controls: [
      {
        category: "Technical",
        description: "Unique user identification",
        id: "164.312.a.1",
        name: "Access Control"
      },
      {
        category: "Technical",
        description: "Assign unique name/number",
        id: "164.312.a.2.i",
        name: "Unique User ID"
      },
      {
        category: "Technical",
        description: "Encrypt/decrypt ePHI",
        id: "164.312.a.2.iv",
        name: "Encryption"
      },
      {
        category: "Technical",
        description: "Record and examine activity",
        id: "164.312.b",
        name: "Audit Controls"
      },
      {
        category: "Technical",
        description: "Protect ePHI from alteration",
        id: "164.312.c.1",
        name: "Integrity Controls"
      },
      {
        category: "Technical",
        description: "Verify person seeking access",
        id: "164.312.d",
        name: "Authentication"
      },
      {
        category: "Technical",
        description: "Guard against unauthorized access during transmission",
        id: "164.312.e.1",
        name: "Transmission Security"
      },
      {
        category: "Administrative",
        description: "Limit PHI use/disclosure",
        id: "164.502.a",
        name: "Minimum Necessary"
      }
    ],
    name: "HIPAA",
    version: "2023"
  },
  soc2: {
    controls: [
      {
        category: "Security",
        description: "Logical access security controls",
        id: "CC6.1",
        name: "Logical Access"
      },
      {
        category: "Security",
        description: "Authentication mechanisms",
        id: "CC6.2",
        name: "Authentication"
      },
      {
        category: "Security",
        description: "Access authorization controls",
        id: "CC6.3",
        name: "Access Authorization"
      },
      {
        category: "Security",
        description: "Boundaries and threats",
        id: "CC6.6",
        name: "System Operations"
      },
      {
        category: "Monitoring",
        description: "Detection of anomalies",
        id: "CC7.1",
        name: "Monitoring"
      },
      {
        category: "Security",
        description: "Security incident handling",
        id: "CC7.2",
        name: "Incident Response"
      },
      {
        category: "Operations",
        description: "Change management controls",
        id: "CC8.1",
        name: "Change Management"
      },
      {
        category: "Risk",
        description: "Risk identification and mitigation",
        id: "CC9.1",
        name: "Risk Mitigation"
      }
    ],
    name: "SOC 2 Type II",
    version: "2022"
  }
};
