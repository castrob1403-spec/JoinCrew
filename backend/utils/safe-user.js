function safeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    country: user.country,
    university: user.university,
    career: user.career,
    subjects: user.subjects,
    availability: user.availability,
    studyPreference: user.studyPreference,
    role: user.role,
    plan: user.plan,
    accountStatus: user.accountStatus,
  };
}

module.exports = { safeUser };
