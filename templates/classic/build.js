module.exports = function buildClassic(json, latex) {

    // Basic replacements
    latex = latex.replace(/{{name}}/g, json.name || "");
    latex = latex.replace(/{{email}}/g, json.email || "");
    latex = latex.replace(/{{phone}}/g, json.phone || "");
    latex = latex.replace(/{{portfolio}}/g, json.portfolio || "");
    latex = latex.replace(/{{github}}/g, json.github || "");
  
    // EDUCATION SECTION
    let eduBlock = json.education
      .map(e => `
        \\resumeSubHeadingListStart
          \\resumeSubheading
            {${e.institution}}{${e.location}}
            {${e.degree}; GPA: ${e.gpa}}{${e.start} - ${e.end}}
          {\\scriptsize \\textit{ \\footnotesize{\\newline{}\\textbf{Courses:} ${e.courses.join(", ")}}}}
        \\resumeSubHeadingListEnd
      `)
      .join("\n");
    latex = latex.replace(/{{education}}/g, eduBlock);
  
    // SKILLS SECTION
    let skillBlock = `
    \\resumeSubHeadingListStart
      ${Object.entries(json.skills)
        .map(([category, items]) =>
          `\\resumeItem{${category}}{${items.join(", ")}}`
        )
        .join("\n")}
    \\resumeSubHeadingListEnd
    `;
    latex = latex.replace(/{{skills}}/g, skillBlock);
  
    // EXPERIENCE SECTION
    let expBlock = json.experience
      .map(exp => `
        \\resumeSubHeadingListStart
          \\resumeSubheading{${exp.company}}{${exp.location}}
            {${exp.role}}{${exp.start} - ${exp.end}}
          \\resumeItemListStart
            ${exp.points
              .map(point => `\\resumeItem{}{${point}}`)
              .join("\n")}
          \\resumeItemListEnd
        \\resumeSubHeadingListEnd
      `)
      .join("\n");
  
    latex = latex.replace(/{{experience}}/g, expBlock);
  
    // PROJECTS SECTION
    let projectBlock = `
    \\resumeSubHeadingListStart
      ${json.projects
        .map(
          p =>
            `\\resumeSubItem{${p.title}}{${p.description} Tech: ${p.tech}}`
        )
        .join("\n")}
    \\resumeSubHeadingListEnd
    `;
    latex = latex.replace(/{{projects}}/g, projectBlock);
  
    // PUBLICATIONS SECTION
    let publicationBlock = `
    \\resumeSubHeadingListStart
      ${json.publications
        .map(p => `\\resumeSubItem{${p.title}}{${p.description}}`)
        .join("\n")}
    \\resumeSubHeadingListEnd
    `;
    latex = latex.replace(/{{publications}}/g, publicationBlock);
  
    // AWARDS SECTION
    let awardsBlock = `
    \\begin{description}[font=$\\bullet$]
      ${json.awards.map(a => `\\item ${a}`).join("\n")}
    \\end{description}
    `;
    latex = latex.replace(/{{awards}}/g, awardsBlock);
  
    // VOLUNTEER SECTION
    let volunteerBlock = json.volunteer
      .map(v => `
        \\resumeSubHeadingListStart
          \\resumeSubheading{${v.role} at ${v.org}}{${v.location}}
            {${v.description}}{${v.start} - ${v.end}}
        \\resumeSubHeadingListEnd
      `)
      .join("\n");
  
    latex = latex.replace(/{{volunteer}}/g, volunteerBlock);
  
    return latex;
  };
  