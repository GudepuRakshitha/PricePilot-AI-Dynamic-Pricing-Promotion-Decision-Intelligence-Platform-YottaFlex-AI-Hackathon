import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { PageHeader, Badge } from "../components/ui";
import { GraduationCap } from "lucide-react";

const DeveloperProfile: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        icon={GraduationCap}
        title="Developer Profile"
        subtitle="GudePU Rakshitha Reddy"
      />

      <div className="max-w-2xl mx-auto p-6">
        <div className="prose max-w-none space-y-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">
            About Me
          </h2>
          <p className="text-slate-600 mb-6">
            Computer Science Engineer | AI/ML Enthusiast | Associate AI Forward Deployed Engineer
          </p>

          <dl className="grid md:grid-cols-2 gap-6">
            <div>
              <dt className="font-medium text-slate-600">Education</dt>
              <dd className="text-slate-600 line-clamp-3">
                B.Tech – Computer Science and Engineering (AI/ML), Alliance University, Bengaluru | CGPA: 8.9/10
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">Professional Experience</dt>
              <dd className="text-slate-600 line-clamp-3">
                • Java Backend Developer Intern at Anugraha (2023)
                • AI/ML Software Development Intern at VETO Studios (2024)
                • Project Intern at IIT Kharagpur (2023)
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">Technical Skills</dt>
              <dd className="text-slate-600 line-clamp-3">
                Languages: Java, Python, SQL, TypeScript, C++ | Frameworks: Spring Boot, FastAPI, Node.js, React | Databases: PostgreSQL, MySQL, MongoDB, Redis | Tools: Docker, Git, AWS
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">Key Projects</dt>
              <dd className="text-slate-600 line-clamp-3">
                • PricePilot AI – Dynamic Pricing & Promotion Decision Intelligence Platform (full-stack pricing platform with React, FastAPI, PostgreSQL 18, deterministic synthetic data generation with seed 20261022)
              </dd>
            </div>
          </dl>

          <div className="space-y-4">
            <h3 className="text-base font-medium text-slate-600 mb-3">Professional Profiles</h3>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.linkedin.com/in/gudepu-rakshitha-reddy-516aa72a9/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 rounded border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition"
              >
                <span className="text-xs font-medium">LinkedIn</span>
              </a>
              <a
                href="https://github.com/GudepuRakshitha"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 rounded border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition"
              >
                <span className="text-xs font-medium">GitHub</span>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 7.369 6.138 5.701-.535.177-.828.243-1.076.243.19 0 .312.01.418.025 6.424 3.445 9.598 6.538 9.598 6.538 1.76 1.134 1.3 2.43 1.3 2.43s-.483-.695-.84-1.218-1.018-1.08-1.018-1.08H12c-.52 0-1.053.058-1.518.12-2.923.816-3.86 1.947-3.86 3.093 0 1.166.412 1.383.765 1.144 2.222-.256 3.103-.743 3.103-1.018 0-1.018-.01-1.48-.016-4.113-1.008-4.113-4.112 0-4.112-4.008-4.112-4.112-1.82 0-3.506.938-4.114 2.055.6 1.268.6 2.557.6 3.863 0 1.308.327 2.12.7 3.093 1.018.98 1.238 1.1 1.1 2.055 0 3.094-1.016 4.112-4.112 4.112-1.308 0-2.473-.7-3.094-1.778-1.56-.878-1.698-1.898-1.898-3.094 0-1.217.23-2.318.42-3.207 2.368 1.117 2.908 3.09 2.908 5.16 0 2.213-1.177 3.063-2.857 3.063-1.117 0-1.853-.39-2.658-1.09-2.658-1.117 0-1.578-.7-2.513-1.848-2.513-1.848-1.063-1.06-.54-1.69.287-2.252 1.328 1.1 3.153 2.25 3.153 4.832 0 3.428-3.02 3.428-3.428 0-1.062-.01-1.957-.016-2.857-4.112-4.112-4.112-4.112-1.308 0-2.473-.7-3.094-1.778-1.56-1.017-1.505-1.867-2.513-2.513-2.513-1.062 0-1.848.48-2.513 1.848l1.848 1.848c.13.13.16 1.532.13 3.207 0 6.13 4.96 6.13 6.13 0 0-3.136-2.03-6.13-6.13l1.848-1.848c.13-.13.16-1.532.13-3.207 0 0-3.136-2.03-6.13-6.13l-1.848-1.848c-.13-.13-.16-1.532-.13-3.207 0-6.13-4.96-6.13-6.13 0 0 3.136 2.03 6.13 6.13 0 1.848.13 3.207.13 3.207zm12 6.157l-3.18 1.868-1.848-1.848-1.118-2.063-1.848 1.848-3.18-1.868-1.848 1.848-1.118 2.063 1.848 1.848 3.18 1.868 1.848-1.848 1.118 2.063 1.848-1.848 3.18 1.868z" />
                </svg>
              </a>
              <a
                href="https://www.researchgate.net/profile/Rakshitha-Reddy-Gudepu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 rounded border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition"
              >
                ResearchGate
              </a>
              <a
                href="https://www.blogger.com/profile/08555579845123121571"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 rounded border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition"
              >
                Blogger
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperProfile;