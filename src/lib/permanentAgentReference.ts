export const AGENT_PROFILE = {
  name: "Alex",
  surname: "Rivera",
  occupation: "Information Technology",
  employment: "Full-time (Information Technology)",
  industry: "Information Technology",
  country: "USA",
  location: "New York, NY, 10001",
  maritalStatus: "Married",
  gender: "Male",
  ethnicity: "Hispanic/Latino",
  household: "Married, 2 children",
  education: "Degree",
  income: "$75,000 - $99,999",
  roles: "IT Professional",
  certifications: "CompTIA Security, AWS Cloud"
};

export const TASK_PROMPT = `
A browser-based autonomous agent for completing paid market research surveys and multi-step screening quizzes.

Target: an online survey or screener on a reward/task platform
Goal: find the survey entry point, navigate each page, answer questions, obey attention checks, and submit the form
Requirements:
- Use the fixed profile and rules from permanentAgentReference.ts
- Keep answers consistent across demographic and behavior questions
- Detect trap/attention-check questions and follow explicit instructions
- Proceed through "Next", "Continue", "Submit", or similar buttons
- Handle multi-step flows, conditional questions, and screening gates
`;
