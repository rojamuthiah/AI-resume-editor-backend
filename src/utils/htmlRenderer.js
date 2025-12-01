const fs = require("fs");
const path = require("path");

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function safeStr(v) {
  return v || "";
}

function renderHTML(templateKey, resumeJson) {
  const templatePath = path.join(
    __dirname,
    "..",
    "..",
    "templates",
    templateKey,
    "template.html"
  );

  let html = fs.readFileSync(templatePath, "utf8");

  // Simple fields
  html = html.replace(/{{name}}/g, safeStr(resumeJson.name));
  html = html.replace(/{{email}}/g, safeStr(resumeJson.email));
  html = html.replace(/{{phone}}/g, safeStr(resumeJson.phone));
  html = html.replace(/{{portfolio}}/g, safeStr(resumeJson.portfolio));
  html = html.replace(/{{github}}/g, safeStr(resumeJson.github));

  // Education
  let eduHTML = "";
  safeArray(resumeJson.education).forEach((edu) => {
    eduHTML += `
      <div class="subheading">
        <div>
          <strong>${safeStr(edu.institution)}</strong><br/>
          ${safeStr(edu.degree)} 
          ${edu.gpa ? "(GPA: " + edu.gpa + ")" : ""}
        </div>
        <div style="text-align:right;">
          ${safeStr(edu.start)} – ${safeStr(edu.end)}<br/>
          <em>${safeStr(edu.location)}</em>
        </div>
      </div>
    `;
  });
  html = html.replace(/{{education_block}}/g, eduHTML);

  // Skills
  let skillsHTML = "";
  if (resumeJson.skills) {
    Object.entries(resumeJson.skills).forEach(([category, list]) => {
      skillsHTML += `<p><strong>${category}:</strong> ${list.join(", ")}</p>`;
    });
  }
  html = html.replace(/{{skills_block}}/g, skillsHTML);

  // Experience
  let expHTML = "";
  safeArray(resumeJson.experience).forEach((exp) => {
    expHTML += `
      <div class="subheading">
        <div>
          <strong>${safeStr(exp.company)}</strong><br/>
          ${safeStr(exp.role)}
        </div>
        <div style="text-align:right;">
          ${safeStr(exp.start)} – ${safeStr(exp.end)}<br/>
          <em>${safeStr(exp.location)}</em>
        </div>
      </div>
      <ul>
        ${safeArray(exp.points).map((p) => `<li>${p}</li>`).join("")}
      </ul>
    `;
  });
  html = html.replace(/{{experience_block}}/g, expHTML);

  // Projects
  let projectHTML = "";
  safeArray(resumeJson.projects).forEach((p) => {
    projectHTML += `
      <p><strong>${p.title}:</strong> ${p.description} (${p.tech})</p>
    `;
  });
  html = html.replace(/{{projects_block}}/g, projectHTML);

  // Publications
  let pubHTML = "";
  safeArray(resumeJson.publications).forEach((p) => {
    pubHTML += `<p><strong>${p.title}:</strong> ${p.description}</p>`;
  });
  html = html.replace(/{{publications_block}}/g, pubHTML);

  // Awards
  let awardsHTML = "";
  safeArray(resumeJson.awards).forEach((award) => {
    awardsHTML += `<p>${award}</p>`;
  });
  html = html.replace(/{{awards_block}}/g, awardsHTML);

  // Volunteer
  let volHTML = "";
  safeArray(resumeJson.volunteer).forEach((v) => {
    volHTML += `
    <div class="subheading">
      <div>
        <strong>${v.role}</strong><br/>
        ${safeStr(v.org)}
      </div>
      <div style="text-align:right;">
        ${safeStr(v.start)} – ${safeStr(v.end)}<br/>
        <em>${safeStr(v.location)}</em>
      </div>
    </div>
    <ul><li>${safeStr(v.description)}</li></ul>
    `;
  });
  html = html.replace(/{{volunteer_block}}/g, volHTML);

  return html;
}

module.exports = renderHTML;
