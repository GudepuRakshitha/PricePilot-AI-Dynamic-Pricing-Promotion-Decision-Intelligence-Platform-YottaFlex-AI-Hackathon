import { useAuth } from "../context/AuthContext";
import { PageHeader, Badge } from "../components/ui";
import {
  GraduationCap,
  Users,
  Library,
  Shield,
  Briefcase,
  BookOpen,
  Folder,
  Github,
  Linkedin,
  Globe,
  ExternalLink,
  Headphones,
} from "lucide-react";

const DeveloperProfile: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const professionalLinks = [
    { name: "LinkedIn", url: "https://www.linkedin.com/in/gudepu-rakshitha-reddy-516aa72a9/", icon: Linkedin },
    { name: "GitHub", url: "https://github.com/GudepuRakshitha", icon: Github },
    { name: "ResearchGate", url: "https://www.researchgate.net/profile/Rakshitha-Reddy-Gudepu", icon: Globe },
    { name: "Blogger", url: "https://www.blogger.com/profile/08555579845123121571", icon: BookOpen },
    { name: "Hugging Face", url: "https://huggingface.co/GudepuRakshithaReddy", icon: Globe },
    { name: "LeetCode", url: "https://leetcode.com/u/RakshithaReddy03/", icon: Folder },
    { name: "HackerRank", url: "https://www.hackerrank.com/profile/rakshithareddy15", icon: Headphones },
  ];

  return (
    <div className="bg-white">
      <PageHeader
        icon={GraduationCap}
        title="Developer Profile"
        subtitle="GudePU Rakshitha Reddy"
      >
      </PageHeader>

      <div className="max-w-7xl mx-auto p-6 min-h-screen">
        <div className="grid md:grid-cols-12 gap-8">

          <div className="md:col-span-8 space-y-6">

            {/* Profile Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative w-24 h-24 shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-slate-100"></div>
                  <img
                    src="/placeholder-profile.svg"
                    alt="Profile"
                    className="rounded-full w-full h-full object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-green-500 w-6 h-6 border-2 white"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-navy-900">
                    Gudepu Rakshitha Reddy
                  </h1>
                  <p className="text-sm text-green-600 font-medium">
                    AI/ML Engineer | Java Backend Developer
                  </p>
                  <p className="text-sm text-slate-500">
                    Bengaluru, Karnataka
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Links */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-4">
                Professional Links
              </h2>
              <div className="flex flex-wrap gap-2">
                {professionalLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full border border-green-400/40 bg-green-50/30 px-3 py-1.5 hover:bg-green-100 hover:text-green-800 transition-colors cursor-pointer"
                    >
                      <Icon className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-slate-700">{link.name}</span>
                      <ExternalLink className="h-3 w-3 text-green-400" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* About Me */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-blue-600 font-medium mb-4 flex items-center gap-2">
                <Badge className="text-xs font-medium bg-blue-500 text-white px-2 py-0.5 rounded">
                  About Me
                </Badge>
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Passionate AI/ML Engineer and Java Backend Developer with hands-on
                experience in backend development, machine learning, deep learning,
                enterprise software development, and research publications. Strong
                interest in Generative AI, scalable backend systems, and intelligent
                decision-support platforms.
              </p>
            </div>

            {/* Education */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-blue-600 font-medium mb-4 flex items-center gap-2">
                <Badge className="text-xs font-medium bg-blue-500 text-white px-2 py-0.5 rounded">
                  Education
                </Badge>
              </h2>
              <div className="space-y-4 pl-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-navy-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">
                      Alliance University
                    </h3>
                    <p className="text-sm text-slate-500">
                      Bachelor of Technology — Computer Science &amp; Engineering (AI &amp; ML)
                    </p>
                  </div>
                  <span className="text-xs text-navy-400">
                    Sep 2022 – May 2026
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-navy-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">
                      Alphores Junior College
                    </h3>
                    <p className="text-sm text-slate-500">
                      Intermediate (MPC)
                    </p>
                  </div>
                  <span className="text-xs text-navy-400">
                    2020 – 2022
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Folder className="h-4 w-4 text-navy-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">
                      Siddartha High School
                    </h3>
                    <p className="text-sm text-slate-500">
                      SSC
                    </p>
                  </div>
                  <span className="text-xs text-navy-400">
                    CGPA: 10 / 10
                  </span>
                </div>
              </div>
            </div>

            {/* Internships */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-blue-600 font-medium mb-4 flex items-center gap-2">
                <Badge className="text-xs font-medium bg-blue-500 text-white px-2 py-0.5 rounded">
                  Internships
                </Badge>
              </h2>
              <div className="space-y-4 relative">
                <div className="absolute left-0 top-0 h-full w-1 bg-navy-400"></div>
                <div className="flex items-start gap-4 pl-4">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">
                      Anugraha Exceed Pvt. Ltd.
                    </h3>
                    <p className="text-sm text-slate-500">
                      Java Backend Developer Intern
                    </p>
                    <p className="text-xs text-navy-400">
                      Jul 2025 – Oct 2025
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pl-4">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">
                      VETO Studios Pvt Ltd
                    </h3>
                    <p className="text-sm text-slate-500">
                      AI Software Development Intern
                    </p>
                    <p className="text-xs text-navy-400">
                      Mar 2024 – Jun 2024
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pl-4">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">
                      IIT Kharagpur
                    </h3>
                    <p className="text-sm text-slate-500">
                      Project Intern
                    </p>
                    <p className="text-xs text-navy-400">
                      Jul 2023 – Nov 2023
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects & Publications */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-blue-600 font-medium mb-4 flex items-center gap-2">
                <Badge className="text-xs font-medium bg-blue-500 text-white px-2 py-0.5 rounded">
                  Projects &amp; Research Publications
                </Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="group rounded-xl p-4 border border-slate-200 hover:border-navy-300 transition-colors">
                  <h3 className="font-medium text-slate-900 group-hover:text-navy-600 transition">
                    SpeechComp-FSQ
                  </h3>
                  <p className="text-xs text-slate-500 group-hover:text-navy-500 transition mt-1">
                    Book Chapter
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Transformer-based speech compression.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">Transformers</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">Speech AI</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">Deep Learning</span>
                  </div>
                </div>
                <div className="group rounded-xl p-4 border border-slate-200 hover:border-navy-300 transition-colors">
                  <h3 className="font-medium text-slate-900 group-hover:text-navy-600 transition">
                    Unified Multimodal AI Engine
                  </h3>
                  <p className="text-xs text-slate-500 group-hover:text-navy-500 transition mt-1">
                    IEEE Conference
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Summarization using Gemini.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">Gemini</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">NLP</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">Vision</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">LLM</span>
                  </div>
                </div>
                <div className="group rounded-xl p-4 border border-slate-200 hover:border-navy-300 transition-colors">
                  <h3 className="font-medium text-slate-900 group-hover:text-navy-600 transition">
                    Smart Food Inventory
                  </h3>
                  <p className="text-xs text-slate-500 group-hover:text-navy-500 transition mt-1">
                    IEEE Accepted
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    RFID-based IoT inventory.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">IoT</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">RFID</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">Cloud</span>
                  </div>
                </div>
                <div className="group rounded-xl p-4 border border-slate-200 hover:border-navy-300 transition-colors">
                  <h3 className="font-medium text-slate-900 group-hover:text-navy-600 transition">
                    Cauliflower Leaf Detection
                  </h3>
                  <p className="text-xs text-slate-500 group-hover:text-navy-500 transition mt-1">
                    IEEE Conference
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hybrid CNN + VAE with Explainable AI.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">CNN</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">GradCAM</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">SHAP</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">87% Accuracy</span>
                  </div>
                </div>
                <div className="group rounded-xl p-4 border border-slate-200 hover:border-navy-300 transition-colors">
                  <h3 className="font-medium text-slate-900 group-hover:text-navy-600 transition">
                    Bayesian Weather Prediction
                  </h3>
                  <p className="text-xs text-slate-500 group-hover:text-navy-500 transition mt-1">
                    Conference Paper
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Probabilistic weather forecasting.
                  </p>
                </div>
                <div className="group rounded-xl p-4 border border-slate-200 hover:border-navy-300 transition-colors">
                  <h3 className="font-medium text-slate-900 group-hover:text-navy-600 transition">
                    Career Recommendation Framework
                  </h3>
                  <p className="text-xs text-slate-500 group-hover:text-navy-500 transition mt-1">
                    IEEE Conference
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    ML-powered personalized career guidance.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">95% Accuracy</span>
                  </div>
                </div>
                <div className="group rounded-xl p-4 border border-slate-200 hover:border-navy-300 transition-colors">
                  <h3 className="font-medium text-slate-900 group-hover:text-navy-600 transition">
                    Face Recognition Attendance
                  </h3>
                  <p className="text-xs text-slate-500 group-hover:text-navy-500 transition mt-1">
                    IEEE Conference
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Computer Vision attendance automation.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">95% Accuracy</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="md:col-span-4 sticky top-8 md:top-auto space-y-6">
            <h3 className="font-medium text-slate-600 text-sm mb-3">Quick Navigation</h3>
            <nav className="space-y-2 text-sm">
              <a href="#hero" className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-navy-300 transition">
                <Users className="h-4 w-4 transition-colors" /> <span>Hero</span>
              </a>
              <a href="#education" className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-navy-300 transition">
                <GraduationCap className="h-4 w-4 transition-colors" /> <span>Education</span>
              </a>
              <a href="#experience" className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-navy-300 transition">
                <Briefcase className="h-4 w-4 transition-colors" /> <span>Experience</span>
              </a>
              <a href="#publications" className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-navy-300 transition">
                <Library className="h-4 w-4 transition-colors" /> <span>Publications</span>
              </a>
              <a href="#certifications" className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-navy-300 transition">
                <Shield className="h-4 w-4 transition-colors" /> <span>Certifications</span>
              </a>
            </nav>
            <div>
              <h3 className="font-medium text-slate-600 text-sm mb-3">Statistics</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div><div className="text-2xl font-bold text-navy-900">12+</div><div className="text-slate-500">Research Projects</div></div>
                <div><div className="text-2xl font-bold text-navy-900">7</div><div className="text-slate-500">Publications</div></div>
                <div><div className="text-2xl font-bold text-navy-900">100+</div><div className="text-slate-500">Certifications</div></div>
                <div><div className="text-2xl font-bold text-navy-900">5</div><div className="text-slate-500">Years Experience</div></div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-slate-500 text-sm">
        <p>
          Designed &amp; Developed by
          <span className="font-medium text-navy-800"> Gudepu Rakshitha Reddy</span>
        </p>
        <p className="mt-1">PricePilot AI · Dynamic Pricing &amp; Promotion Decision Intelligence Platform</p>
      </div>
    </div>
  );
};

export default DeveloperProfile;