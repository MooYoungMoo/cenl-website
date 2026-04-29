import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  FileText,
  FlaskConical,
  FolderKanban,
  Gauge,
  GraduationCap,
  Mail,
  Microscope,
  Newspaper,
  Receipt,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

export type SiteMeta = {
  shortName: string;
  name: string;
  fullName: string;
  tagline: string;
  location: string;
  email: string;
  office: string;
};

export type NavigationItem = {
  href: string;
  label: string;
};

export type IconLink = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type TimelineEntry = {
  period: string;
  title: string;
  description: string;
};

export type PiProfile = {
  name: string;
  title: string;
  degree: string;
  email: string;
  biography: string;
  educationCareer: TimelineEntry[];
  professionalExperiences: string[];
  awardsHonors: string[];
};

export type LabMember = {
  id: string;
  name: string;
  degree: string;
  biography: string;
  email: string;
};

export type AlumniProfile = {
  id: string;
  name: string;
  role: string;
  affiliation: string;
  contact: string;
};

export type PatentItem = {
  id: string;
  title: string;
  inventors: string;
  status: string;
};

export type ContactCard = {
  title: string;
  icon: LucideIcon;
  description: string;
};

export type StatItem = {
  value: string;
  label: string;
};

export type PortalDashboardCard = {
  label: string;
  value: string;
};

export type ApprovalRecord = {
  title: string;
  status: string;
  date: string;
};

export type AdminPlaceholderItem = {
  label: string;
};

export const siteMeta: SiteMeta = {
  shortName: "CENL",
  name: "ChemoElectronic Nanomaterials Lab",
  fullName: "ChemoElectronic Nanomaterials Lab (CENL)",
  tagline: "Chemoelectronic materials, sensor systems, and nanoscience for intelligent chemical perception.",
  location: "Seoul, South Korea",
  email: "cenl@example.edu",
  office: "Engineering Research Building, Room 000",
};

export const navigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/research", label: "Research" },
  { href: "/members", label: "Members" },
  { href: "/publications", label: "Publications" },
  { href: "/news", label: "News" },
  { href: "/contact", label: "Contact" },
  { href: "/portal", label: "Lab Portal" },
];

export type ResearchTopic = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  points: string[];
  imageLabel: string;
  icon: LucideIcon;
};

export const researchTopics: ResearchTopic[] = [
  {
    slug: "electronic-nose-system-development",
    title: "Electronic Nose System Development",
    summary:
      "Sensor arrays and learning systems that identify volatile chemical signatures across complex environments.",
    description:
      "CENL develops electronic nose platforms by pairing nanomaterial-based sensing layers with signal processing, device integration, and pattern recognition workflows.",
    points: [
      "Chemoelectronic sensor arrays",
      "Volatile organic compound detection",
      "Signal processing and classification",
      "Portable sensing hardware",
    ],
    imageLabel: "Sensor array placeholder",
    icon: Gauge,
  },
  {
    slug: "nanomaterial-sensor-interfaces",
    title: "Nanomaterial Sensor Interfaces",
    summary:
      "Functional nanomaterials designed to transform molecular interactions into measurable electronic responses.",
    description:
      "The lab studies surface chemistry, transport behavior, and device architectures that improve selectivity, stability, and sensitivity.",
    points: [
      "Functional surface design",
      "Hybrid nanomaterial films",
      "Device response optimization",
      "Long-term stability studies",
    ],
    imageLabel: "Nanofilm placeholder",
    icon: Microscope,
  },
  {
    slug: "chemical-data-intelligence",
    title: "Chemical Data Intelligence",
    summary:
      "Data-driven analysis methods that turn sensing signals into interpretable chemical information.",
    description:
      "CENL builds analysis pipelines for sensor calibration, drift correction, model comparison, and transparent reporting of chemical sensing results.",
    points: [
      "Sensor data curation",
      "Model evaluation",
      "Drift-aware analysis",
      "Interpretable chemical patterns",
    ],
    imageLabel: "Data map placeholder",
    icon: Sparkles,
  },
];

export const piProfile: PiProfile = {
  name: "Prof. CENL Principal Investigator",
  title: "Principal Investigator",
  degree: "Ph.D. in Materials Science and Engineering",
  email: "pi.cenl@example.edu",
  biography:
    "The principal investigator leads CENL's research on chemoelectronic nanomaterials, sensor systems, and intelligent chemical analysis. This placeholder profile can be replaced with the PI's official biography, education, awards, and selected publications.",
  educationCareer: [
    {
      period: "2024-Present",
      title: "Principal Investigator, ChemoElectronic Nanomaterials Lab",
      description: "Leading research programs in nanomaterial-based chemical sensing and electronic nose systems.",
    },
    {
      period: "2021-2024",
      title: "Faculty Appointment Placeholder",
      description: "Developed independent research directions in chemoelectronic materials and sensor interfaces.",
    },
    {
      period: "2016-2021",
      title: "Ph.D. in Materials Science and Engineering",
      description: "Placeholder education entry for official degree, institution, and dissertation details.",
    },
  ],
  professionalExperiences: [
    "Editorial board, chemical sensing journal placeholder",
    "Program committee, nanomaterials and devices conference placeholder",
    "Industry collaboration lead for portable chemical monitoring platform placeholder",
  ],
  awardsHonors: [
    "Early Career Research Award placeholder",
    "Outstanding Teaching and Mentorship Recognition placeholder",
    "Best Paper or Presentation Award placeholder",
  ],
};

export const memberSections: IconLink[] = [
  {
    href: "/members/pi",
    title: "Principal Investigator",
    description: "View the PI profile, career timeline, experiences, and honors.",
    icon: UserRound,
  },
  {
    href: "/members/lab-members",
    title: "Lab Members",
    description: "Browse student and researcher profile cards with contact placeholders.",
    icon: Users,
  },
  {
    href: "/members/alumni",
    title: "Alumni",
    description: "Find former members and current affiliation placeholders.",
    icon: GraduationCap,
  },
];

export const labMembers: LabMember[] = [
  {
    id: "ari-kim",
    name: "Ari Kim",
    degree: "Ph.D. Student",
    biography:
      "Works on nanomaterial sensor arrays for volatile compound detection and device response optimization.",
    email: "ari.kim@example.edu",
  },
  {
    id: "minseo-park",
    name: "Minseo Park",
    degree: "M.S. Student",
    biography:
      "Studies data analysis workflows for electronic nose systems and sensor drift correction.",
    email: "minseo.park@example.edu",
  },
  {
    id: "joon-lee",
    name: "Joon Lee",
    degree: "Integrated M.S./Ph.D. Student",
    biography:
      "Develops portable sensing prototypes and evaluates materials for real-world chemical monitoring.",
    email: "joon.lee@example.edu",
  },
  {
    id: "hana-choi",
    name: "Hana Choi",
    degree: "Undergraduate Researcher",
    biography:
      "Supports device fabrication, measurement preparation, and lab-scale sensing experiments.",
    email: "hana.choi@example.edu",
  },
];

export const alumni: AlumniProfile[] = [
  {
    id: "yuna-seo",
    name: "Yuna Seo",
    role: "M.S. Alumni",
    affiliation: "Research Engineer, Sensor Technology Company Placeholder",
    contact: "yuna.seo@example.edu",
  },
  {
    id: "taewon-shin",
    name: "Taewon Shin",
    role: "Ph.D. Alumni",
    affiliation: "Postdoctoral Researcher, Materials Institute Placeholder",
    contact: "taewon.shin@example.edu",
  },
  {
    id: "claire-moon",
    name: "Claire Moon",
    role: "Undergraduate Research Alumni",
    affiliation: "Graduate Student, University Placeholder",
    contact: "Optional contact placeholder",
  },
];

export type PublicationItem = {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  label: "Article" | "Review" | "Featured";
  imageLabel: string;
  citationCount?: number | null;
};

export const publicationItems: PublicationItem[] = [
  {
    id: "chemoelectronic-nanomaterial-arrays",
    title: "Chemoelectronic Nanomaterial Arrays for Selective Vapor Recognition",
    authors: "CENL Research Team",
    journal: "Advanced Sensing Materials",
    year: "2026",
    label: "Featured",
    imageLabel: "Graphical abstract placeholder",
    citationCount: null,
  },
  {
    id: "drift-aware-electronic-nose",
    title: "Drift-Aware Learning for Electronic Nose Measurements",
    authors: "CENL Research Team",
    journal: "Chemical Sensor Systems",
    year: "2026",
    label: "Article",
    imageLabel: "Signal map placeholder",
    citationCount: null,
  },
  {
    id: "surface-functionalized-sensing-films",
    title: "Surface-Functionalized Sensing Films for Portable Chemical Detection",
    authors: "CENL Research Team",
    journal: "Nanomaterials Interfaces",
    year: "2025",
    label: "Article",
    imageLabel: "Nanofilm cover placeholder",
    citationCount: null,
  },
  {
    id: "chemoelectronic-interfaces-voc",
    title: "Chemoelectronic Interfaces for Volatile Organic Compound Analysis",
    authors: "CENL Research Team",
    journal: "Materials Chemistry Reviews",
    year: "2025",
    label: "Review",
    imageLabel: "Review cover placeholder",
    citationCount: null,
  },
  {
    id: "modular-sensor-cartridges",
    title: "Modular Sensor Cartridges for Laboratory Electronic Nose Platforms",
    authors: "CENL Research Team",
    journal: "Device Engineering Letters",
    year: "2025",
    label: "Article",
    imageLabel: "Device module placeholder",
    citationCount: null,
  },
  {
    id: "hybrid-nanomaterial-films",
    title: "Hybrid Nanomaterial Films with Tunable Chemical Affinity",
    authors: "CENL Research Team",
    journal: "Functional Materials Reports",
    year: "2024",
    label: "Featured",
    imageLabel: "Hybrid film placeholder",
    citationCount: null,
  },
  {
    id: "interpretable-vapor-classification",
    title: "Interpretable Classification of Complex Vapor Mixtures",
    authors: "CENL Research Team",
    journal: "Sensors and Data Science",
    year: "2024",
    label: "Article",
    imageLabel: "Data pattern placeholder",
    citationCount: null,
  },
  {
    id: "low-power-readout",
    title: "Low-Power Readout Strategies for Nanomaterial Sensor Arrays",
    authors: "CENL Research Team",
    journal: "Electronic Materials Systems",
    year: "2024",
    label: "Article",
    imageLabel: "Circuit cover placeholder",
    citationCount: null,
  },
  {
    id: "electronic-nose-benchmarking",
    title: "Benchmarking Protocols for Electronic Nose Experiments",
    authors: "CENL Research Team",
    journal: "Analytical Methods Placeholder",
    year: "2023",
    label: "Review",
    imageLabel: "Protocol cover placeholder",
    citationCount: null,
  },
];

export const papers = publicationItems;

export const latestPublications = publicationItems;

export const publicationSections: IconLink[] = [
  {
    href: "/publications/papers",
    title: "Papers",
    description: "Journal articles, conference papers, and manuscript placeholders.",
    icon: FileText,
  },
  {
    href: "/publications/patents",
    title: "Patents",
    description: "Filed, pending, and disclosed intellectual property placeholders.",
    icon: ScrollText,
  },
];

export const publicationCovers: string[] = [
  "Journal cover placeholder 01",
  "Graphical abstract placeholder 02",
  "Featured article placeholder 03",
  "Sensor array cover placeholder 04",
  "Nanomaterial interface placeholder 05",
  "Electronic nose cover placeholder 06",
];

export const patents: PatentItem[] = [
  {
    id: "nanomaterial-sensor-array",
    title: "Nanomaterial-Based Sensor Array for Volatile Compound Detection",
    inventors: "CENL Research Team",
    status: "Filed placeholder",
  },
  {
    id: "portable-electronic-nose-cartridges",
    title: "Portable Electronic Nose Platform with Modular Sensing Cartridges",
    inventors: "CENL Research Team",
    status: "Disclosure placeholder",
  },
];

export type NewsCategory =
  | "student awards"
  | "PI awards"
  | "group events"
  | "research updates"
  | "general lab news";

export type NewsItem = {
  slug: string;
  date: string;
  category: NewsCategory;
  title: string;
  description: string;
  body: string[];
  imageLabel: string;
  galleryLabels: string[];
};

export const newsItems: NewsItem[] = [
  {
    slug: "student-award-sensor-poster",
    date: "April 18, 2026",
    category: "student awards",
    title: "CENL student receives recognition for sensor poster presentation",
    description:
      "A student presentation on nanomaterial sensor arrays was recognized at a departmental research showcase.",
    body: [
      "This placeholder story highlights student research momentum in the lab. The final version can include the student's name, event details, award title, and presentation topic.",
      "The project focused on improving how electronic nose systems identify complex vapor patterns using tailored sensing materials and interpretable analysis.",
    ],
    imageLabel: "Award photo placeholder",
    galleryLabels: ["Poster session placeholder", "Award ceremony placeholder", "Lab celebration placeholder"],
  },
  {
    slug: "pi-recognition-chemoelectronic-research",
    date: "March 27, 2026",
    category: "PI awards",
    title: "PI recognized for contributions to chemoelectronic materials research",
    description:
      "The lab celebrates a faculty milestone connected to chemical sensing and nanomaterial device research.",
    body: [
      "This article is a placeholder for PI award news. It can later include the official award name, awarding organization, and research significance.",
      "CENL's research vision connects fundamental material design with practical sensing systems for environmental, biomedical, and industrial applications.",
    ],
    imageLabel: "Faculty award placeholder",
    galleryLabels: ["Award venue placeholder", "Faculty portrait placeholder", "Research highlight placeholder"],
  },
  {
    slug: "spring-group-workshop",
    date: "February 14, 2026",
    category: "group events",
    title: "Spring workshop brings lab members together for research planning",
    description:
      "CENL held a group workshop to review active projects and plan upcoming experiments.",
    body: [
      "The group event page can later include photos, agenda notes, and project planning outcomes.",
      "The workshop emphasized shared experimental standards, reproducible measurement workflows, and mentoring across student cohorts.",
    ],
    imageLabel: "Group event placeholder",
    galleryLabels: ["Workshop discussion placeholder", "Team planning placeholder", "Group photo placeholder"],
  },
  {
    slug: "electronic-nose-platform-update",
    date: "January 30, 2026",
    category: "research updates",
    title: "Electronic nose platform prototype enters a new testing phase",
    description:
      "The lab is preparing placeholder evaluation workflows for portable chemical sensing prototypes.",
    body: [
      "This research update summarizes progress on a portable electronic nose platform. Details can later be replaced with measured performance, device photos, and collaborator notes.",
      "The current interface is designed to make future technical updates easy to publish without adding a database yet.",
    ],
    imageLabel: "Prototype placeholder",
    galleryLabels: ["Device bench placeholder", "Sensor module placeholder", "Measurement setup placeholder"],
  },
  {
    slug: "cenl-website-launch",
    date: "January 8, 2026",
    category: "general lab news",
    title: "CENL launches a refreshed frontend website structure",
    description:
      "The new website organizes research, members, publications, news, contact information, and portal placeholders.",
    body: [
      "This launch note marks the first frontend-only version of the CENL website.",
      "Authentication, databases, purchasing workflows, and administrative data integrations are intentionally left for later phases.",
    ],
    imageLabel: "Website placeholder",
    galleryLabels: ["Homepage preview placeholder", "News editor placeholder", "Publication layout placeholder"],
  },
];

export const contactDetails: string[] = [
  siteMeta.fullName,
  siteMeta.office,
  "Department placeholder, University placeholder",
  siteMeta.location,
  "Email: cenl@example.edu",
];

export type PortalLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const portalLinks: PortalLink[] = [
  {
    href: "/portal/purchase-request",
    label: "Purchase Request",
    description: "Prepare internal purchase request drafts for PI or admin review.",
    icon: ClipboardList,
  },
  {
    href: "/portal/budget-dashboard",
    label: "Budget Dashboard",
    description: "Preview grant balances, planned spending, and budget summaries.",
    icon: Wallet,
  },
  {
    href: "/portal/approval-history",
    label: "Approval History",
    description: "Track placeholder approval status and internal review history.",
    icon: FolderKanban,
  },
  {
    href: "/portal/receipts",
    label: "Receipts",
    description: "Organize receipt placeholders for future reimbursement workflows.",
    icon: Receipt,
  },
  {
    href: "/portal/admin",
    label: "Admin",
    description: "Private-looking controls for lab operations and portal settings.",
    icon: ShieldCheck,
  },
];

export const purchaseRequestFields: string[] = [
  "Item or Service",
  "Requester",
  "Grant or Project",
  "Estimated Cost",
];

export const budgetDashboardCards: PortalDashboardCard[] = [
  { label: "Active Grants", value: "3" },
  { label: "Planned Requests", value: "12" },
  { label: "Pending Review", value: "5" },
  { label: "Receipt Queue", value: "8" },
];

export const approvalRecords: ApprovalRecord[] = [
  { title: "Gas sensor materials order", status: "Approved", date: "2026-04-14" },
  { title: "Conference registration", status: "Pending", date: "2026-04-11" },
  { title: "Prototype enclosure fabrication", status: "Returned", date: "2026-04-05" },
];

export const receiptItems: string[] = [
  "Sensor substrate invoice.pdf",
  "Conference registration receipt.pdf",
  "Prototype parts order.png",
  "Software renewal receipt.pdf",
];

export const adminItems: AdminPlaceholderItem[] = [
  { label: "Member role placeholders" },
  { label: "Budget category placeholders" },
  { label: "Portal announcement placeholders" },
  { label: "Request review settings" },
];

export const quickStats: StatItem[] = [
  { value: "3", label: "Core research themes" },
  { value: "5", label: "News categories" },
  { value: "UI", label: "Portal phase" },
];

export const homeFeatureLinks: IconLink[] = [
  {
    title: "Research",
    href: "/research",
    icon: FlaskConical,
    description: "Explore CENL's work in chemoelectronic nanomaterials and sensing systems.",
  },
  {
    title: "Members",
    href: "/members",
    icon: Users,
    description: "Meet the PI and lab members shaping the research program.",
  },
  {
    title: "Publications",
    href: "/publications",
    icon: Newspaper,
    description: "Browse placeholder paper and patent sections ready for real entries.",
  },
];

export const contactHighlights: ContactCard[] = [
  {
    title: "M.S. & Ph.D. Recruiting",
    icon: GraduationCap,
    description:
      "CENL welcomes motivated students interested in nanomaterials, chemical sensors, electronics, data analysis, and hands-on device research.",
  },
  {
    title: "Lab Contact",
    icon: Mail,
    description:
      "Prospective students and collaborators can reach the lab by email with a short introduction, research interests, and relevant background.",
  },
];
