const jwt = require("jsonwebtoken");

function generateToken(user) {
    const payload = { id: user._id, role: user.role };

    // Embed the teacher's faculty role in the token as a fast-path cache. Routes that
    // enforce access control still refresh this from the database via the
    // loadFacultyScope middleware, so a role change takes effect without re-login.
    if (user.role === "teacher") {
        payload.facultyType = user.facultyType || null;
        payload.facultySubjects = user.facultySubjects || [];
    }

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

module.exports = generateToken;