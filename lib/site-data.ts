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
  location?: string;
  description?: string;
  advisors?: string[];
  details?: string[];
};

export type PiProfile = {
  name: string;
  position: string;
  affiliation: string[];
  emails: string[];
  externalProfiles: string[];
  summary: string;
  educationCareer: TimelineEntry[];
  professionalExperiences: TimelineEntry[];
  awardsHonors: TimelineEntry[];
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
  fields?: {
    label: string;
    values: string[];
    type?: "email" | "text";
  }[];
};

export type StatItem = {
  value: string;
  label: string;
};

export type PortalDashboardCard = {
  label: string;
  value: string;
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
  name: "Young-Moo Jo, Ph.D.",
  position: "Assistant Professor",
  affiliation: [
    "School of Materials Science & Engineering",
    "Kyungpook National University",
  ],
  emails: ["jym754@knu.ac.kr", "jym754@gmail.com"],
  externalProfiles: ["Google Scholar", "ORCID", "LinkedIn"],
  summary:
    "Assistant Professor, School of Materials Science & Engineering, Kyungpook National University",
  educationCareer: [
    {
      period: "Mar. 1, 2025 – present",
      title: "Assistant Professor, Kyungpook National University",
      location: "Daegu, South Korea",
    },
    {
      period: "Jul. 1, 2022 – Feb. 15, 2025",
      title: "Postdoctoral Associate, Massachusetts Institute of Technology",
      location: "Cambridge, USA",
      advisors: ["Prof. Mircea Dinca"],
    },
    {
      period: "Mar. 1, 2022 – Feb. 28, 2023",
      title: "BK21 Research Professor, Korea University",
      location: "Seoul, Korea",
    },
    {
      period: "Mar. 2016 – Feb. 2022",
      title: "M.S./Ph.D., Materials Science and Engineering, Korea University",
      location: "Seoul, Korea",
      advisors: ["Prof. Jong-Heun Lee"],
    },
    {
      period: "Mar. 2010 – Feb. 2016",
      title: "B.S., Materials Science and Engineering, Korea University",
      location: "Seoul, Korea",
    },
  ],
  professionalExperiences: [
    {
      period: "Dec. 2025 – present",
      title: "Director of Industry–Academia Cooperation, The Korean Sensors Society",
    },
    {
      period: "Sep. 2025 – Jun. 2026",
      title: "Co-organizer of Materials and Devices for Smart Sensors, GCIM2026",
    },
    {
      period: "Nov. 2025 – Oct. 2026",
      title:
        "Early Career Editorial Board Member of Nanotechnology and Precision Engineering, AIP Publishing",
    },
    {
      period: "Nov. 11 – Nov. 13, 2019",
      title:
        "Program Organizer of Korea Univ.–Kyushu Univ. Student Joint Workshop, Kyushu University",
      location: "Fukuoka, Japan",
      advisors: ["Prof. Jong-Heun Lee", "Prof. Kengo Shimanoe"],
    },
    {
      period: "Mar. 4 – Mar. 15, 2019",
      title:
        "Visiting Student, Block Course of Chemical Sensors, University of Tübingen",
      location: "Tübingen, Germany",
      advisors: ["Prof. Udo Weimer", "Dr. Nicolae Barsan"],
    },
    {
      period: "Aug. 27 – Aug. 31, 2018",
      title: "Visiting Student, National Research Nuclear University MEPhI",
      location: "Moscow, Russia",
      advisors: ["Prof. Nikolay Samotaev"],
    },
    {
      period: "Jul. 7 – Jul. 24, 2018",
      title:
        "Visiting Student, Signal Processing of Chemical Sensor Array, Kangwon National University",
      location: "Samcheok, Korea",
      advisors: ["Prof. Hyung-Gi Byun"],
    },
    {
      period: "Jan. 30, 2012 – Oct. 29, 2013",
      title:
        "Non-academic career: Military Service, ROK Army 7th Infantry Division Air Defence",
      location: "Hwacheon, Korea",
    },
  ],
  awardsHonors: [
    {
      period: "Mar. 2022 – Feb. 2027",
      title:
        "Sejong Science Fellowship Grant ($100,000/year), National Research Foundation of Korea (NRF) by the Korea government",
      location: "Korea",
      details: [
        "Given to 311 researchers out of postdoctoral researchers.",
        "Project: Room Temperature High Performance Gas Sensor using Light-Activated Metal-Organic Frameworks",
      ],
    },
    {
      period: "Mar. 2022 – Feb. 2023",
      title:
        "Postdoctoral Fellowship ($32,200), Brain Korea 21 PLUS (BK21 PLUS), Ministry of Science and ICT",
      location: "Korea",
    },
    {
      period: "Feb. 2022",
      title: "KU Achievement Award, Korea University",
      location: "Korea",
      details: ["Given to 32 graduate students out of 8700."],
    },
    {
      period: "Feb. 2022",
      title: "Best Paper Award, BK21 Plus Program in Korea University",
      location: "Korea",
    },
    {
      period: "Aug. 2021",
      title: "Best Paper Award, Korea University",
      location: "Korea",
    },
    {
      period: "Nov. 2018",
      title: "Best Paper Presentation Award, Korea Sensors Society",
      location: "Korea",
    },
    {
      period: "Aug. 2018",
      title:
        "Best Poster Paper Award, International Union of Materials Research Societies-ICEM 2018",
      location: "Korea",
    },
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
  doi: string;
  doiUrl?: string;
  imageLabel: string;
  citationCount?: number | null;
};

export const publicationItems: PublicationItem[] = [
  {
    id: "methanol-ethanol-discrimination-conductive-mofs",
    title:
      "Methanol-Ethanol Discrimination and Selective Sensing Enabled by Molecular Sieving in Conductive MOFs",
    authors: "Young-Moo Jo†, Mingyu Jeon†, Dong-Ha Kim, Jihan Kim, Mircea Dincă*",
    journal: "Advanced Materials",
    year: "2026",
    label: "Article",
    doi: "TBD",
    imageLabel: "Publication image placeholder",
    citationCount: null,
  },
  {
    id: "functionalized-carbon-nanotube-integrated-sensors",
    title:
      "Tunable and Highly-Sensitive Functionalized Carbon Nanotube-Based Integrated Sensors for Chemical Gas Sensing",
    authors:
      "Jaekang Song†, Dong-Ha Kim†, Jan Tiepelt, Young-Moo Jo, Graham McGrath, Michael Song, Tianyang Chen, Jiande Wang, Max Shulaker*, Mircea Dincă*, Marc Baldo*",
    journal: "Nature Sensors",
    year: "2026",
    label: "Article",
    doi: "https://www.nature.com/articles/s44460-026-00037-z",
    doiUrl: "https://www.nature.com/articles/s44460-026-00037-z",
    imageLabel: "Publication image placeholder",
    citationCount: null,
  },
  {
    id: "photoactivated-conductive-mof-thin-film-arrays",
    title:
      "Photoactivated Conductive MOF Thin Film Arrays on Micro-LEDs for Chemiresistive Gas Sensing",
    authors:
      "K. Lee†, Y.-M. Jo*†, M. S. Sohn†, M. Jeon, C. Kim, O. Gul, S. J. Park, K. B. Kim, K. S. Chang, C. B. Jeong, J. Kim, Y. C. Kang*, I. Park*",
    journal: "Nature Communications",
    year: "2025",
    label: "Article",
    doi: "https://www.nature.com/articles/s41467-025-64602-9",
    doiUrl: "https://www.nature.com/articles/s41467-025-64602-9",
    imageLabel: "Publication image placeholder",
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

export type NewsCategoryFilter = NewsCategory | "all";

export type NewsCategoryOption = {
  label: string;
  value: NewsCategoryFilter;
};

export type NewsGalleryImage = {
  label: string;
  caption?: string;
};

export type NewsItem = {
  slug: string;
  title: string;
  date: string;
  category: NewsCategory;
  summary: string;
  body: string[];
  representativeImage: string;
  galleryImages: NewsGalleryImage[];
};

export const newsCategoryOptions: NewsCategoryOption[] = [
  { label: "All", value: "all" },
  { label: "Student Awards", value: "student awards" },
  { label: "PI Awards", value: "PI awards" },
  { label: "Group Events", value: "group events" },
  { label: "Research Updates", value: "research updates" },
  { label: "General Lab News", value: "general lab news" },
];

export const newsItems: NewsItem[] = [
  {
    slug: "student-award-sensor-poster",
    date: "April 18, 2026",
    category: "student awards",
    title: "CENL student receives recognition for sensor poster presentation",
    summary:
      "A student presentation on nanomaterial sensor arrays was recognized at a departmental research showcase.",
    body: [
      "This placeholder story highlights student research momentum in the lab. The final version can include the student's name, event details, award title, and presentation topic.",
      "The project focused on improving how electronic nose systems identify complex vapor patterns using tailored sensing materials and interpretable analysis.",
    ],
    representativeImage: "Award photo placeholder",
    galleryImages: [
      { label: "Poster session placeholder", caption: "Optional poster-session caption placeholder." },
      { label: "Award ceremony placeholder", caption: "Optional award-photo caption placeholder." },
      { label: "Lab celebration placeholder", caption: "Optional group-photo caption placeholder." },
    ],
  },
  {
    slug: "pi-recognition-chemoelectronic-research",
    date: "March 27, 2026",
    category: "PI awards",
    title: "PI recognized for contributions to chemoelectronic materials research",
    summary:
      "The lab celebrates a faculty milestone connected to chemical sensing and nanomaterial device research.",
    body: [
      "This article is a placeholder for PI award news. It can later include the official award name, awarding organization, and research significance.",
      "CENL's research vision connects fundamental material design with practical sensing systems for environmental, biomedical, and industrial applications.",
    ],
    representativeImage: "Faculty award placeholder",
    galleryImages: [
      { label: "Award venue placeholder", caption: "Optional venue caption placeholder." },
      { label: "Faculty portrait placeholder", caption: "Optional portrait caption placeholder." },
      { label: "Research highlight placeholder", caption: "Optional research-image caption placeholder." },
    ],
  },
  {
    slug: "spring-group-workshop",
    date: "February 14, 2026",
    category: "group events",
    title: "Spring workshop brings lab members together for research planning",
    summary:
      "CENL held a group workshop to review active projects and plan upcoming experiments.",
    body: [
      "The group event page can later include photos, agenda notes, and project planning outcomes.",
      "The workshop emphasized shared experimental standards, reproducible measurement workflows, and mentoring across student cohorts.",
    ],
    representativeImage: "Group event placeholder",
    galleryImages: [
      { label: "Workshop discussion placeholder", caption: "Optional discussion caption placeholder." },
      { label: "Team planning placeholder", caption: "Optional planning caption placeholder." },
      { label: "Group photo placeholder", caption: "Optional group-photo caption placeholder." },
    ],
  },
  {
    slug: "electronic-nose-platform-update",
    date: "January 30, 2026",
    category: "research updates",
    title: "Electronic nose platform prototype enters a new testing phase",
    summary:
      "The lab is preparing placeholder evaluation workflows for portable chemical sensing prototypes.",
    body: [
      "This research update summarizes progress on a portable electronic nose platform. Details can later be replaced with measured performance, device photos, and collaborator notes.",
      "The current interface is designed to make future technical updates easy to publish without adding a database yet.",
    ],
    representativeImage: "Prototype placeholder",
    galleryImages: [
      { label: "Device bench placeholder", caption: "Optional device-bench caption placeholder." },
      { label: "Sensor module placeholder", caption: "Optional sensor-module caption placeholder." },
      { label: "Measurement setup placeholder", caption: "Optional measurement caption placeholder." },
    ],
  },
  {
    slug: "cenl-website-launch",
    date: "January 8, 2026",
    category: "general lab news",
    title: "CENL launches a refreshed frontend website structure",
    summary:
      "The new website organizes research, members, publications, news, contact information, and portal placeholders.",
    body: [
      "This launch note marks the first frontend-only version of the CENL website.",
      "Authentication, databases, purchasing workflows, and administrative data integrations are intentionally left for later phases.",
    ],
    representativeImage: "Website placeholder",
    galleryImages: [
      { label: "Homepage preview placeholder", caption: "Optional homepage preview caption placeholder." },
      { label: "News editor placeholder", caption: "Optional future-admin caption placeholder." },
      { label: "Publication layout placeholder", caption: "Optional publications caption placeholder." },
    ],
  },
];

export const contactDetails = {
  lab: "ChemoElectronic Nanomaterials Lab",
  contactPerson: "TBD",
  role: "Lab manager / student contact, TBD",
  emails: ["TBD"],
  address: "TBD",
  note: "This section should be easy to update later through a future Admin page.",
};

export const recruitingInformation = {
  title: "M.S. & Ph.D. Recruiting",
  description:
    "We are looking for motivated students interested in chemoelectronic nanomaterials, gas sensors, electronic nose systems, and materials-based sensing platforms.",
  areas: [
    "Chemoelectronic nanomaterials",
    "Gas sensors",
    "Electronic nose systems",
    "Metal-organic frameworks",
    "Sensor materials and devices",
  ],
  applicationContacts: ["jym754@knu.ac.kr", "jym754@gmail.com"],
};

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
    description: "Submit merchant-based requests for pending payment tracking.",
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
    label: "Payment Tracker",
    description: "Group pending merchant requests and record paid expenses.",
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
  { label: "Funding Sources", value: "3" },
  { label: "Pending Payments", value: "12" },
  { label: "Paid Requests", value: "5" },
  { label: "Receipt Queue", value: "8" },
];

export const receiptItems: string[] = [
  "Sensor substrate invoice.pdf",
  "Conference registration receipt.pdf",
  "Prototype parts order.png",
  "Software renewal receipt.pdf",
];

export const adminItems: AdminPlaceholderItem[] = [
  { label: "Funding source management placeholder" },
  { label: "Member and role management placeholder" },
  { label: "Publication and news management placeholder" },
  { label: "Portal settings placeholder" },
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
    title: recruitingInformation.title,
    icon: GraduationCap,
    description: recruitingInformation.description,
    fields: [
      {
        label: "Recruiting areas",
        values: recruitingInformation.areas,
      },
      {
        label: "Application contact",
        values: recruitingInformation.applicationContacts,
        type: "email",
      },
    ],
  },
  {
    title: "Lab Contact",
    icon: Mail,
    description: "",
    fields: [
      { label: "Lab", values: [contactDetails.lab] },
      { label: "Contact person", values: [contactDetails.contactPerson] },
      { label: "Role", values: [contactDetails.role] },
      { label: "Email", values: contactDetails.emails, type: "email" },
      { label: "Address", values: [contactDetails.address] },
      { label: "Note", values: [contactDetails.note] },
    ],
  },
];
