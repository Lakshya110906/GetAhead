"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Check, ChevronDown, X } from "lucide-react";

// Categorized subjects mapping
export const subjectGroups = [
  {
    category: "🏫 School — Core",
    subjects: [
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "English Language & Literature",
      "Hindi",
      "History",
      "Geography",
      "Political Science / Civics",
      "Economics",
      "Accountancy",
      "Business Studies",
      "Computer Science",
      "Information Technology",
      "Environmental Science",
      "Physical Education",
      "Psychology",
      "Sociology",
      "Home Science",
      "Fine Arts",
    ],
  },
  {
    category: "🔬 Science & Engineering",
    subjects: [
      "Applied Mathematics",
      "Statistics & Probability",
      "Discrete Mathematics",
      "Linear Algebra",
      "Calculus & Differential Equations",
      "Engineering Mathematics",
      "Engineering Physics",
      "Engineering Chemistry",
      "Thermodynamics",
      "Fluid Mechanics",
      "Strength of Materials",
      "Control Systems",
      "Signal & Systems",
      "Electromagnetic Theory",
      "Analog Electronics",
      "Digital Electronics",
      "Electrical Machines",
      "Power Systems",
      "Communication Systems",
      "VLSI Design",
      "Microprocessors & Microcontrollers",
      "Robotics & Automation",
      "Mechatronics",
      "Manufacturing Technology",
      "CAD / CAM",
      "Civil Engineering — Structural Analysis",
      "Construction Materials & Testing",
      "Surveying & Geomatics",
      "Environmental Engineering",
      "Geotechnical Engineering",
      "Transportation Engineering",
      "Chemical Engineering — Mass Transfer",
      "Chemical Engineering — Reaction Engineering",
      "Biotechnology",
      "Genetics & Molecular Biology",
      "Biochemistry",
      "Microbiology",
      "Organic Chemistry",
      "Inorganic Chemistry",
      "Physical Chemistry",
    ],
  },
  {
    category: "💻 Computer Science",
    subjects: [
      "Data Structures & Algorithms (DSA)",
      "Database Management Systems (DBMS)",
      "Operating Systems (OS)",
      "Computer Networks (CN)",
      "Object-Oriented Programming (OOP)",
      "Software Engineering",
      "Theory of Computation (TOC)",
      "Compiler Design",
      "Computer Architecture & Organization",
      "Artificial Intelligence (AI)",
      "Machine Learning (ML)",
      "Deep Learning & Neural Networks",
      "Data Science & Analytics",
      "Web Technologies & Full-Stack Development",
      "Cloud Computing & DevOps",
      "Cybersecurity & Cryptography",
      "Mobile App Development",
      "Big Data & Distributed Systems",
      "Human-Computer Interaction (HCI)",
      "Computer Graphics & Visualization",
      "Parallel & Distributed Computing",
      "Internet of Things (IoT)",
      "Blockchain Technology",
      "Quantum Computing",
      "Natural Language Processing (NLP)",
      "Computer Vision",
      "Augmented & Virtual Reality (AR/VR)",
      "Game Development",
      "DevSecOps",
      "Software Testing & QA",
    ],
  },
  {
    category: "📊 Commerce & Management",
    subjects: [
      "Financial Accounting",
      "Cost Accounting & Management Accounting",
      "Auditing & Assurance",
      "Corporate Finance",
      "Investment Analysis & Portfolio Management",
      "Banking & Financial Services",
      "Insurance",
      "Taxation — Direct Tax",
      "Taxation — Indirect Tax (GST)",
      "Company Law & Corporate Governance",
      "Business Law & Contracts",
      "Marketing Management",
      "Human Resource Management",
      "Operations Management",
      "Supply Chain & Logistics",
      "Entrepreneurship",
      "International Business",
      "Strategic Management",
      "Organizational Behaviour",
      "Business Analytics",
      "E-Commerce",
      "Managerial Economics",
      "Research Methodology",
    ],
  },
  {
    category: "⚖️ Law & Humanities",
    subjects: [
      "Constitutional Law",
      "Criminal Law",
      "Civil Procedure Code",
      "Contract Law",
      "Law of Torts",
      "International Law",
      "Administrative Law",
      "Labour & Employment Law",
      "Intellectual Property Law",
      "Environmental Law",
      "Family Law",
      "Philosophy",
      "Logic & Critical Thinking",
      "Public Administration",
      "International Relations",
      "Development Economics",
      "Public Finance",
      "Agricultural Economics",
    ],
  },
  {
    category: "🩺 Medical & Health Sciences",
    subjects: [
      "Human Anatomy",
      "Physiology",
      "Pathology",
      "Pharmacology",
      "Microbiology & Immunology",
      "Community Medicine",
      "Medicine & Allied Subjects",
      "Surgery",
      "Obstetrics & Gynaecology",
      "Paediatrics",
      "Psychiatry",
      "Dermatology",
      "Radiology",
      "Ophthalmology",
      "ENT (Ear, Nose & Throat)",
      "Orthopaedics",
      "Nursing — Fundamentals",
      "Public Health & Epidemiology",
    ],
  },
  {
    category: "📝 Competitive Exams",
    subjects: [
      "UPSC — General Studies Paper I",
      "UPSC — General Studies Paper II (CSAT)",
      "UPSC — General Studies Paper III",
      "UPSC — General Studies Paper IV (Ethics)",
      "GATE — Computer Science",
      "GATE — Electronics & Communication",
      "GATE — Mechanical Engineering",
      "GATE — Civil Engineering",
      "GATE — Electrical Engineering",
      "CAT — Quantitative Aptitude",
      "CAT — Verbal Ability & Reading Comprehension",
      "CAT — Data Interpretation & Logical Reasoning",
      "JEE — Physics",
      "JEE — Chemistry",
      "JEE — Mathematics",
      "NEET — Biology",
      "NEET — Physics",
      "NEET — Chemistry",
      "Banking — General Awareness",
      "Banking — Quantitative Aptitude",
      "Banking — Reasoning Ability",
      "Banking — English Language",
      "SSC — General Intelligence & Reasoning",
      "SSC — English Comprehension",
      "SSC — Quantitative Aptitude",
      "SSC — General Awareness",
      "GRE — Verbal Reasoning",
      "GRE — Quantitative Reasoning",
      "IELTS — Academic Reading",
      "IELTS — Academic Writing",
      "TOEFL — Reading & Listening",
    ],
  },
];

interface SubjectSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export function SubjectSelector({
  value,
  onChange,
  placeholder = "Search or select subject...",
  id,
}: SubjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("getahead_custom_subjects");
      if (saved) {
        const parsed = JSON.parse(saved);
        setTimeout(() => {
          setCustomSubjects(parsed);
        }, 0);
      }
    } catch (e) {
      console.error("Failed to load custom subjects:", e);
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddCustom = (newSubject: string) => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;

    // Check if it already exists in built-in or custom lists (case-insensitive)
    const allSubjects = [
      ...subjectGroups.flatMap((g) => g.subjects),
      ...customSubjects,
    ];
    const exists = allSubjects.some((s) => s.toLowerCase() === trimmed.toLowerCase());

    if (!exists) {
      const updated = [trimmed, ...customSubjects];
      setCustomSubjects(updated);
      try {
        localStorage.setItem("getahead_custom_subjects", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save custom subject:", e);
      }
    }

    onChange(trimmed);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleRemoveCustom = (e: React.MouseEvent, sub: string) => {
    e.stopPropagation();
    const updated = customSubjects.filter((s) => s !== sub);
    setCustomSubjects(updated);
    try {
      localStorage.setItem("getahead_custom_subjects", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save custom subject removal:", err);
    }
    if (value === sub) {
      onChange("");
    }
  };

  // Filter groups and custom list based on search
  const filteredGroups = subjectGroups
    .map((group) => {
      const matching = group.subjects.filter((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...group, subjects: matching };
    })
    .filter((group) => group.subjects.length > 0);

  const filteredCustom = customSubjects.filter((s) =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exactMatchExists = [
    ...subjectGroups.flatMap((g) => g.subjects),
    ...customSubjects,
  ].some((s) => s.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-left text-sm"
      >
        <span className={value ? "text-gray-900 font-medium" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-80 overflow-hidden flex flex-col animate-fade-in">
          {/* Search bar */}
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400 ml-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or type custom subject..."
              className="flex-1 px-2 py-1.5 text-sm focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subjects feed */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {/* Show Add Custom option if not matched exactly */}
            {searchQuery.trim() && !exactMatchExists && (
              <button
                type="button"
                onClick={() => handleAddCustom(searchQuery)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-semibold"
              >
                <Plus className="w-4 h-4" />
                Use Custom Subject: &quot;{searchQuery.trim()}&quot;
              </button>
            )}

            {/* Custom subjects group */}
            {filteredCustom.length > 0 && (
              <div className="space-y-1">
                <p className="text-xxs font-bold text-gray-400 uppercase tracking-wide px-3">
                  ✨ Custom Subjects
                </p>
                {filteredCustom.map((sub) => (
                  <div
                    key={sub}
                    onClick={() => {
                      onChange(sub);
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group"
                  >
                    <span className="font-medium">{sub}</span>
                    <div className="flex items-center gap-1">
                      {value === sub && <Check className="w-4 h-4 text-blue-600" />}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveCustom(e, sub)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Filtered grouped subjects */}
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <div key={group.category} className="space-y-1">
                  <p className="text-xxs font-bold text-gray-400 uppercase tracking-wide px-3">
                    {group.category}
                  </p>
                  {group.subjects.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        onChange(sub);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl cursor-pointer transition-all text-left"
                    >
                      <span>{sub}</span>
                      {value === sub && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              searchQuery && filteredCustom.length === 0 && (
                <p className="text-center text-gray-400 text-xs py-4">
                  No matching built-in subjects. Use options above to add it!
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
