const Student = require("../models/Student");

async function loadFacultyScope(req, res, next) {
  try {
    if (req.user && req.user.role === "teacher") {
      const teacher = await Student.findById(req.user.id).select(
        "facultyType facultySubjects facultySetupComplete"
      );
      if (teacher) {
        req.user.facultyType = teacher.facultyType || null;
        req.user.facultySubjects = teacher.facultySubjects || [];
        req.user.facultySetupComplete = !!teacher.facultySetupComplete;
      }
    }
    next();
  } catch (err) {
    console.error("loadFacultyScope warning:", err.message);
    next();
  }
}

function isSubjectScoped(user) {
  return !!(
    user &&
    user.role === "teacher" &&
    user.facultyType === "subject" &&
    Array.isArray(user.facultySubjects) &&
    user.facultySubjects.length > 0
  );
}

function requireCoordinatorLevel(req, res, next) {
  if (isSubjectScoped(req.user)) {
    return res.status(403).json({
      error: "This action is available to the Class Coordinator only.",
    });
  }
  next();
}

module.exports = { loadFacultyScope, isSubjectScoped, requireCoordinatorLevel };