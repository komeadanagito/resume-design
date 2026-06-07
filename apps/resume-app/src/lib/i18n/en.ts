import type { zh } from "./zh";

// Mirror of `zh.ts`. TypeScript ensures every key in `zh` has an English
// translation here — drop a key on one side and the type check fails.

type Schema = typeof zh;

export const en: Schema = {
  nav: {
    overview: "Overview",
    content: "Content",
    customize: "Customize",
    aiTools: "AI Tools",
    resumeDropdown: "Resume 1",
    download: "Download",
    more: "More",
  },
  personal: {
    sectionTitle: "Personal Details",
    placeholderName: "Your name",
    placeholderEmail: "Email",
    placeholderPhone: "Phone",
    placeholderAddress: "Address",
    editAriaLabel: "Edit personal details",
    panelTitle: "Edit Personal Details",
    close: "Close",
    fullName: "Full name",
    fullNamePlaceholder: "Enter your title, first- and last name",
    professionalTitle: "Professional title",
    professionalTitlePlaceholder: "Target position or current role",
    email: "Email",
    emailPlaceholder: "Enter email",
    phone: "Phone",
    phonePlaceholder: "Enter phone",
    location: "Location",
    locationPlaceholder: "City, Country",
    photo: "Photo",
    addDetails: "Add details",
    extras: {
      linkedin: "LinkedIn",
      website: "Website",
      nationality: "Nationality",
      dateOfBirth: "Date of Birth",
      visa: "Visa",
      passportOrId: "Passport or ID",
      availability: "Availability",
    },
    showMore: "Show More",
    done: "Done",
    validation: {
      fullNameRequired: "Please enter your name",
      emailInvalid: "Invalid email address",
    },
  },
  editor: {
    addContent: "Add Content",
    previewPlaceholder: "Preview (later phase)",
    loading: "Loading…",
    errorPrefix: "Error: ",
    noResume: "No resume loaded",
  },
  addContent: {
    title: "Add content",
    quickStart: "Quick start:",
    importResume: "Import Resume",
    closeAriaLabel: "Close",
    emptyBodyHint: "(Section cards will be added in a later phase)",
    added: "Added",
    descriptions: {
      summary: "Add a short summary of your key strengths, experience, and career goals.",
      experience: "Add your professional roles and employer history including internships.",
      education: "Add your degrees and schools. Include your focus, honors, or exchange terms.",
      skills: "Add your hard and soft skills that help you stand out from the crowd today.",
    },
  },
  sections: {
    summary: "Summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
  },
  sectionCard: {
    expand: "Expand",
    collapse: "Collapse",
    newEntry: "New entry",
    emptyHint: "Nothing yet",
    edit: "Edit",
    delete: "Delete",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
  },
  summary: {
    contentLabel: "Content",
    contentPlaceholder: "Add a short summary of your key strengths, experience, and career goals.",
  },
};
