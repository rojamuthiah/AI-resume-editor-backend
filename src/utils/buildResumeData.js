module.exports = function buildResumeData(resumeJson, previewData = null) {
  const data = {
    ...resumeJson,
    ...(previewData || {}),
  };

  return {
    ...data,

    hasSummary: !!data.summary,

    hasEducation:
      Array.isArray(data.education) && data.education.length > 0,

    hasExperience:
      Array.isArray(data.experience) && data.experience.length > 0,

    hasProjects:
      Array.isArray(data.projects) && data.projects.length > 0,

    hasPublications:
      Array.isArray(data.publications) && data.publications.length > 0,

    hasAwards:
      Array.isArray(data.awards) && data.awards.length > 0,

    hasVolunteer:
      Array.isArray(data.volunteer) && data.volunteer.length > 0,

    hasSkills:
      data.skills && Object.keys(data.skills).length > 0,

    skillsArray: Object.entries(data.skills || {}).map(
      ([category, values]) => ({
        category,
        values: Array.isArray(values)
          ? values.join(", ")
          : String(values),
      })
    ),
  };
};
