/**
 * Pure Mutual Skill Matching Engine
 * Identifies complementary peer pairs where:
 *  1) Current student can teach a skill that Candidate wants to learn
 *  2) Candidate can teach a skill that Current student wants to learn
 */

export function normalizeSkillName(name) {
  return String(name || '').trim().toLowerCase();
}

export function computeMutualMatches({ currentUserId, users, skills, reviews = [] }) {
  const myTeach = skills.filter(
    (s) => s.userId === currentUserId && s.skillType === 'Teach'
  );
  const myLearn = skills.filter(
    (s) => s.userId === currentUserId && s.skillType === 'Learn'
  );

  const myTeachMap = new Map(
    myTeach.map((s) => [normalizeSkillName(s.skillName), s])
  );
  const myLearnMap = new Map(
    myLearn.map((s) => [normalizeSkillName(s.skillName), s])
  );

  const matches = [];

  for (const candidate of users) {
    if (
      candidate._id === currentUserId ||
      candidate.role === 'admin' ||
      candidate.status === 'suspended'
    ) {
      continue;
    }

    const theirTeach = skills.filter(
      (s) => s.userId === candidate._id && s.skillType === 'Teach'
    );
    const theirLearn = skills.filter(
      (s) => s.userId === candidate._id && s.skillType === 'Learn'
    );

    const iCanTeachThem = [];
    for (const desired of theirLearn) {
      const key = normalizeSkillName(desired.skillName);
      if (myTeachMap.has(key)) {
        iCanTeachThem.push({
          skillName: myTeachMap.get(key).skillName,
          myLevel: myTeachMap.get(key).skillLevel,
          theirTargetLevel: desired.skillLevel,
        });
      }
    }

    const theyCanTeachMe = [];
    for (const offered of theirTeach) {
      const key = normalizeSkillName(offered.skillName);
      if (myLearnMap.has(key)) {
        theyCanTeachMe.push({
          skillName: offered.skillName,
          theirLevel: offered.skillLevel,
          myTargetLevel: myLearnMap.get(key).skillLevel,
        });
      }
    }

    if (iCanTeachThem.length > 0 && theyCanTeachMe.length > 0) {
      const userReviews = reviews.filter((r) => r.reviewedUserId === candidate._id);
      const averageRating =
        userReviews.length > 0
          ? Number(
              (
                userReviews.reduce((acc, r) => acc + Number(r.rating), 0) /
                userReviews.length
              ).toFixed(1)
            )
          : null;

      // Score rewards balanced bidirectional depth (0-100)
      const pairCount = Math.min(iCanTeachThem.length, theyCanTeachMe.length);
      const extraCount = iCanTeachThem.length + theyCanTeachMe.length - pairCount * 2;
      const levelBonus = [...iCanTeachThem, ...theyCanTeachMe].reduce((sum, item) => {
        const lvl = item.myLevel || item.theirLevel;
        if (lvl === 'Advanced') return sum + 4;
        if (lvl === 'Intermediate') return sum + 2;
        return sum + 1;
      }, 0);
      const compatibilityScore = Math.min(
        99,
        72 + pairCount * 10 + extraCount * 3 + Math.min(12, levelBonus)
      );

      matches.push({
        user: {
          _id: candidate._id,
          name: candidate.name,
          email: candidate.email,
          university: candidate.university,
          department: candidate.department,
          semester: candidate.semester,
          profilePicture: candidate.profilePicture || '',
          bio: candidate.bio || '',
          averageRating,
          reviewCount: userReviews.length,
        },
        iCanTeachThem,
        theyCanTeachMe,
        theirTeachSkills: theirTeach,
        theirLearnSkills: theirLearn,
        compatibilityScore,
        mutualPairCount: iCanTeachThem.length + theyCanTeachMe.length,
      });
    }
  }

  return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

export function calculateProfileCompletion(user, userSkills) {
  if (!user) return 0;
  let score = 0;
  if (user.name && user.name.trim()) score += 15;
  if (user.university && user.university.trim()) score += 15;
  if (user.department && user.department.trim()) score += 10;
  if (user.semester && user.semester.trim()) score += 10;
  if (user.bio && user.bio.trim().length >= 20) score += 15;
  if (user.profilePicture && user.profilePicture.trim()) score += 5;
  const hasTeach = userSkills.some((s) => s.skillType === 'Teach');
  const hasLearn = userSkills.some((s) => s.skillType === 'Learn');
  if (hasTeach) score += 15;
  if (hasLearn) score += 15;
  return Math.min(100, score);
}
