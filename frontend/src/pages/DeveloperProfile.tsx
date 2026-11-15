import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { PageHeader, Badge } from "../components/ui";

const DeveloperProfile: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        icon="GraduationCap"
        title="Developer Profile"
        subtitle="Gudepu Rakshitha Reddy"
      />

      <div className="max-w-2xl mx-auto p-6">
        <div className="prose max-w-none">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">
            About Me
          </h2>
          <p className="text-slate-600 mb-6">
            Computer Science Engineer | AI/ML Enthusiast | Associate AI Forward Deployed Engineer
          </p>

          <dl className="grid md:grid-cols-2 gap-6">
            <div>
              <dt className="font-medium text-slate-600">Education</dt>
              <dd className="text-slate-600 line-clamp-2">
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

          <div className="mt-8 pt-8 border-t border-slate-200">
            <h3 className="text-base font-medium text-slate-600 mb-4">Professional Links</h3>
            <div className="space-y-3">
              <a
                href="https://www.linkedin.com/in/gudepu-rakshitha-reddy-516aa72a9/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-brand-600 transition"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/GudepuRakshitha"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-brand-600 transition"
              >
                GitHub
              </a>
              <a
                href="https://www.researchgate.net/profile/Rakshitha-Reddy-Gudepu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-brand-600 transition"
              >
                ResearchGate
              </a>
              <a
                href="https://www.blogger.com/profile/08555579845123121571"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-brand-600 transition"
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