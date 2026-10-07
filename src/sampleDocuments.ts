export interface SampleDocument {
  id: string;
  name: string;
  category: string;
  description: string;
  text: string;
}

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: 'cs101-syllabus',
    name: 'CS101_AI_and_Algorithms_Syllabus_2026.txt',
    category: 'Academic Syllabus',
    description: 'Course policies, grading rubric, weekly modules, and project deadlines.',
    text: `COURSE SYLLABUS: CS101 - Introduction to Artificial Intelligence & Modern Algorithms
Term: Fall 2026 | Department of Computer Science & Engineering
Instructor: Dr. Elena Rostova (erostova@university.edu) | Office Hours: Tue/Thu 2:00 PM - 4:00 PM
Teaching Assistants: Marcus Chen, Priya Patel | Lab: Turing Hall Room 304

1. COURSE DESCRIPTION & OBJECTIVES
CS101 provides a comprehensive undergraduate introduction to artificial intelligence, search algorithms, heuristic optimization, machine learning fundamentals, and ethics in automated systems. Students will gain theoretical insights into algorithmic complexity as well as hands-on coding experience implementing foundational models.

By the conclusion of the course, students will be able to:
- Formulate search problems using BFS, DFS, A* heuristic search, and minimax with alpha-beta pruning.
- Understand supervised machine learning principles including regression, classification, and cross-validation.
- Analyze ethical dilemmas, algorithmic bias, data privacy, and societal implications of automated decision-making.
- Implement an end-to-end applied AI project using Python and standard scientific computing libraries.

2. PREREQUISITES
Proficiency in Python programming (equivalent to CS50/CS100) and introductory discrete mathematics.

3. REQUIRED TEXTS & MATERIALS
- Russell, S. and Norvig, P. (2020). Artificial Intelligence: A Modern Approach (4th Edition).
- Selected research papers and lab tutorials provided on the course portal at no cost.

4. COURSE SCHEDULE & WEEKLY MODULES
- Weeks 1-2: Classical Problem Solving, Uninformed Search, State Space Representation.
- Weeks 3-4: Informed (Heuristic) Search: Greedy Best-First, A* Search, Admissibility and Consistency.
- Weeks 5-6: Adversarial Search and Game Playing: Minimax, Evaluation Functions, Alpha-Beta Pruning.
- Week 7: Midterm Examination (Date: October 22, 2026, In-Class, 90 minutes).
- Weeks 8-10: Supervised Learning Foundations: Linear Models, Decision Trees, Overfitting, Regularization.
- Weeks 11-12: Neural Networks & Deep Learning Intro: Perceptrons, Backpropagation, Gradient Descent.
- Weeks 13-14: Large Language Models, Transformer Architecture, and Prompt Engineering.
- Week 15: AI Ethics, Bias Detection, Fairness, and Capstone Project Presentations.

5. GRADING CRITERIA & ASSESSMENT BREAKDOWN
- Programming Problem Sets (5 assignments, 6% each): 30%
- Midterm Examination: 20%
- Final Term Project: 25% (Proposal 5%, Prototype 10%, Final Code & Report 10%)
- Weekly Lab Exercises & Quizzes: 15%
- Active Class Participation: 10%

6. CRITICAL DEADLINES & ACTION ITEMS
- September 15, 2026: Assignment 1 (Search Algorithms Implementation) due at 11:59 PM.
- October 05, 2026: Capstone Project 1-page proposal submission.
- October 22, 2026: Midterm Exam (Bring student ID, closed-book with one 8.5x11 inch handwritten cheat-sheet).
- November 18, 2026: Assignment 4 (Classifier Pipeline) due.
- December 08, 2026: Final Project Code, Technical Report, and 5-minute video demo submission.
- December 14, 2026: Final Project Poster Session in Turing Hall Atrium.

7. COURSE POLICIES & ACADEMIC INTEGRITY
- Late Policy: Each student is granted two "slip days" throughout the semester to submit assignments up to 48 hours late without penalty. Subsequent late submissions incur a 15% penalty per 24 hours.
- Collaboration Policy: Students may discuss high-level conceptual ideas in study groups, but all code, mathematical proofs, and written answers must be independently written.
- Use of Generative AI: AI tools (like ChatGPT or Gemini) may be used for brainstorming and explaining theoretical concepts. However, submitting AI-generated code as one's own without attribution constitutes academic misconduct and will result in an automatic grade of zero for the assignment.`
  },
  {
    id: 'greencampus-grant',
    name: 'GreenCampus_Sustainability_Grant_Proposal_2026.txt',
    category: 'Grant Proposal',
    description: 'Funding request for smart solar canopies and IoT energy monitoring on university campus.',
    text: `PROJECT GRANT PROPOSAL: The GreenCampus Initiative - Smart Microgrids & IoT Conservation
Applicant: Student Sustainability Council & Clean Energy Laboratory
Target Fund: University Endowment Innovation Fund (Grant Round 14)
Primary Investigators: Maya Lin (B.S. Environmental Engineering '27), Dr. Raymond Vance (Faculty Advisor)
Requested Funding: $75,000 | Project Period: January 1, 2027 – December 31, 2027

1. EXECUTIVE SUMMARY
The GreenCampus Initiative proposes the installation of smart solar canopies over Student Parking Structure C combined with an intelligent IoT energy monitoring network across 8 campus residence halls. By pairing renewable energy generation with real-time student energy dashboards, the initiative targets a 22% reduction in peak-hour electrical consumption, generating an estimated annual savings of $38,400 while providing undergraduate research opportunities in clean technology.

2. PROBLEM STATEMENT & BACKGROUND
The university campus consumes approximately 14.2 gigawatt-hours of electricity annually, with student housing contributing 34% of overall grid draw. Current electrical metering is aggregated by building cluster, preventing students from visualizing their direct energy footprint. Furthermore, Parking Structure C has 18,000 square feet of unshaded rooftop parking that absorbs extreme heat during summer months, increasing ambient cooling demand.

3. PROJECT OBJECTIVES & MILESTONES
- Objective 1: Construct a 60 kW solar canopy array on the top deck of Parking Structure C by April 2027.
- Objective 2: Deploy 120 non-invasive IoT power meters across Residence Halls North and South by June 2027.
- Objective 3: Launch the "GreenCampus Mobile Dashboard" allowing 3,500 campus residents to track floor-by-floor energy use and participate in monthly conservation challenges.
- Objective 4: Integrate real-time power analytics into undergraduate electrical engineering coursework (EE204 and ENV101).

4. BUDGET ALLOCATION ($75,000 TOTAL)
- Solar Canopy Hardware & Inverters: $42,000
- IoT Smart Sensors & LoRaWAN Gateways: $14,500
- Certified Electrical Contractor Labor: $11,000
- Student Software Developer Stipends (2 undergraduates x 150 hrs): $5,000
- Community Engagement, Signage, & Launch Hackathon: $2,500

5. RISK MANAGEMENT & SAFETY
All electrical tie-ins will be performed by state-licensed electrical contractors in strict compliance with National Electrical Code (NEC Article 690). Weather monitoring sensors will include automatic microgrid shutdown during severe thunderstorms.

6. ACTION ITEMS & TIMELINE FOR REVIEW BOARD
- November 15, 2026: Endowment Committee interview and final Q&A presentation.
- December 01, 2026: Procurement vendor selection and university facilities permit approvals.
- January 15, 2027: Groundbreaking and sensor installation begins.
- June 30, 2027: Mid-term progress review and preliminary solar output report to University Trustees.`
  },
  {
    id: 'cybersecurity-policy-v1',
    name: 'Remote_Work_Security_Policy_v1_2025.txt',
    category: 'Corporate Policy (v1 Baseline)',
    description: 'Original baseline company remote work policy with standard VPN and password guidelines.',
    text: `COMPANY POLICY DOCUMENT: Remote Work & Data Security Policy (Version 1.2 - 2025)
Issuing Department: IT Security & Operations | Target Audience: All Global Employees
Effective Date: March 1, 2025 | Supersedes: All previous remote guidance

1. PURPOSE & SCOPE
This policy sets forth the mandatory guidelines for employees authorized to work remotely or from home. All permanent employees, contractors, and interns handling company data must adhere to these standards.

2. HARDWARE & EQUIPMENT
- Employees will be issued a standard company laptop (MacBook Air or ThinkPad T14).
- Personal devices (BYOD) may NOT be used to store customer financial records or source code.
- Employees may connect personal peripherals such as keyboards, monitors, and mice.

3. NETWORK SECURITY & ACCESS
- Remote staff must connect to the corporate network via the GlobalProtect VPN whenever accessing internal repositories, CRM software, or database servers.
- Use of public open Wi-Fi without VPN is strictly prohibited.
- Home Wi-Fi routers must use WPA2 encryption or higher with a password of at least 10 characters.

4. PASSWORD & AUTHENTICATION STANDARDS
- Passwords must be a minimum of 12 characters, including upper and lower case letters, numbers, and symbols.
- Passwords must be changed every 90 days.
- Two-factor authentication (2FA) via SMS or email code is required for Google Workspace and GitHub.

5. DATA CLASSIFICATION & STORAGE
- All documents containing sensitive client data must be stored on Google Drive or OneDrive. Local hard drive storage of unencrypted client records is forbidden.
- Physical documents containing customer information must be shredded prior to disposal.

6. INCIDENT REPORTING
Any lost laptop or suspected phishing link must be reported to security@company.com within 24 hours of occurrence.`
  },
  {
    id: 'cybersecurity-policy-v2',
    name: 'Remote_Work_Security_Policy_v2_2026.txt',
    category: 'Corporate Policy (v2 Revised)',
    description: 'Updated 2026 revision with Zero Trust, Hardware Security Keys, and AI tool compliance.',
    text: `COMPANY POLICY DOCUMENT: Remote Work & Data Security Policy (Version 2.0 - 2026 REVISED)
Issuing Department: Information Security & Compliance | Target Audience: All Global Employees & Contractors
Effective Date: January 15, 2026 | Supersedes: Version 1.2 (2025)

1. PURPOSE & SCOPE
This policy defines the updated security controls under the enterprise Zero-Trust Architecture. It applies to all hybrid and fully remote personnel across all jurisdictions.

2. HARDWARE & ZERO-TRUST ENDPOINT COMPLIANCE
- Employees are issued managed laptops pre-configured with endpoint telemetry (CrowdStrike Falcon).
- BYOD is completely prohibited for any production systems access.
- Bluetooth peripheral usage in public spaces is prohibited due to keystroke-sniffing vulnerabilities.

3. NETWORK ACCESS & ZERO TRUST (REPLACES VPN)
- The legacy GlobalProtect VPN has been decommissioned.
- Access to all company infrastructure is now enforced through Cloudflare Zero Trust (Zscaler / SASE) with continuous posture verification.
- Employees connecting from international locations outside their home country must file a Travel Security Notice at least 5 business days in advance.

4. AUTHENTICATION: PASSWORDS DEPRECATED IN FAVOR OF PASSKEYS & HARDWARE KEYS
- The 90-day password rotation requirement is officially eliminated (in alignment with NIST SP 800-63B recommendations to prevent weak rotational passwords).
- SMS and email 2FA are deprecated due to SIM-swapping risks.
- All employees must authenticate using FIDO2 Hardware Security Keys (YubiKey 5C) or biometric passkeys (TouchID / Windows Hello).

5. ARTIFICIAL INTELLIGENCE & LLM TOOL USE POLICY (NEW SECTION)
- Employees may NOT paste confidential customer data, source code, or unreleased financials into public AI tools.
- All AI workflows must use the approved internal Enterprise AI Gateway (with zero data retention guarantees).

6. DATA CLASSIFICATION & ENCRYPTION
- Local hard drive full-disk encryption (FileVault 2 or BitLocker 256-bit AES) is mandatory and managed centrally.
- USB flash drives and external hard drives are disabled on all company machines.

7. INCIDENT REPORTING & COMPLIANCE
- Critical incident notification window is shortened: Any lost device or security breach must be reported to the 24/7 Security Operations Center via emergency hotline within 2 hours (previously 24 hours).
- Failure to comply with security key requirements will result in automated account lockout.`
  }
];
