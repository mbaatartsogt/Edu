import ResourcePage from './ResourcePage';
import { branchesConfig, faqsConfig, programsConfig, rewardsConfig, teachersConfig } from './resources';

const configs = { programs: programsConfig, teachers: teachersConfig, branches: branchesConfig, faqs: faqsConfig, rewards: rewardsConfig };

// key={kind} — таб солиход хуудсыг шинээр ачаална
export default function ContentPages({ kind }) {
  return <ResourcePage key={kind} config={configs[kind]} />;
}
