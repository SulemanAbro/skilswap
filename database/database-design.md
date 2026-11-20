# SkillSwap MongoDB Database Design

## Overview

SkillSwap uses a document-oriented MongoDB database (`skillswap`) with six primary collections linked via ObjectId references. Every document uses standard 24-character hexadecimal `_id` identifiers and ISO-8601 timestamps.

---

## Collections & Schemas

### 1. `users`
Stores student and administrator account profiles, authentication hashes, and academic metadata.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId (string) | Yes | Primary identifier |
| `name` | String | Yes | Full name of student or administrator |
| `email` | String (Unique) | Yes | Institutional or personal email |
| `passwordHash` | String | Yes | Scrypt salted password hash (`salt:hash`) |
| `university` | String | Yes | University / college name |
| `department` | String | Yes | Academic department |
| `semester` | String | Yes | Current semester or academic standing |
| `profilePicture` | String | No | Path or URL to avatar image |
| `bio` | String | No | Short personal introduction |
| `role` | Enum (`student`, `admin`) | Yes | Access control role |
| `status` | Enum (`active`, `suspended`) | Yes | Account moderation status |
| `createdAt` | Date (ISO String) | Yes | Registration timestamp |

### 2. `skills`
Stores skills that each student can teach or wants to learn.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId (string) | Yes | Primary identifier |
| `userId` | ObjectId -> `users._id` | Yes | Owner student reference |
| `skillName` | String | Yes | Skill title (e.g., `Python Programming`) |
| `skillType` | Enum (`Teach`, `Learn`) | Yes | Direction of skill |
| `skillLevel` | Enum (`Beginner`, `Intermediate`, `Advanced`) | Yes | Proficiency or target depth |
| `description` | String | No | Scope, tools, or learning goals |
| `createdAt` | Date (ISO String) | Yes | Creation timestamp |

### 3. `requests`
Tracks peer-to-peer skill exchange requests and lifecycle transitions.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId (string) | Yes | Primary identifier |
| `senderId` | ObjectId -> `users._id` | Yes | Student initiating the request |
| `receiverId` | ObjectId -> `users._id` | Yes | Target matching student |
| `offeredSkill` | String | Yes | Skill offered by sender |
| `requestedSkill` | String | Yes | Skill requested from receiver |
| `message` | String | No | Introductory proposal note |
| `status` | Enum (`Pending`, `Accepted`, `Rejected`, `Cancelled`, `Completed`) | Yes | State machine status |
| `createdAt` | Date (ISO String) | Yes | Request creation timestamp |

### 4. `sessions`
Stores scheduled and completed learning sessions created from accepted exchange requests.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId (string) | Yes | Primary identifier |
| `requestId` | ObjectId -> `requests._id` | Yes | Originating accepted request |
| `teacherId` | ObjectId -> `users._id` | Yes | Student teaching the primary skill |
| `learnerId` | ObjectId -> `users._id` | Yes | Student learning the primary skill |
| `skillName` | String | Yes | Primary skill taught in session |
| `exchangeSkill` | String | No | Reciprocal skill in the exchange |
| `sessionDate` | String (`YYYY-MM-DD`) | Yes | Scheduled session date |
| `sessionTime` | String (`HH:mm`) | Yes | Scheduled local time |
| `meetingType` | Enum (`Online`, `In-person`) | Yes | Delivery format |
| `description` | String | No | Agenda, campus room, or meeting link |
| `status` | Enum (`Scheduled`, `Completed`, `Cancelled`) | Yes | Session progress status |
| `createdAt` | Date (ISO String) | Yes | Scheduling timestamp |

### 5. `reviews`
Stores post-exchange ratings and written feedback. Restricted strictly to `Completed` sessions.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId (string) | Yes | Primary identifier |
| `sessionId` | ObjectId -> `sessions._id` | Yes | Completed session reference |
| `reviewerId` | ObjectId -> `users._id` | Yes | Student writing the review |
| `reviewedUserId` | ObjectId -> `users._id` | Yes | Student receiving the review |
| `rating` | Number (`1..5`) | Yes | Integer star rating |
| `comment` | String | Yes | Written review prose |
| `createdAt` | Date (ISO String) | Yes | Submission timestamp |

### 6. `reports`
Stores user-submitted reports for inappropriate accounts or content reviewed in the Admin Dashboard.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId (string) | Yes | Primary identifier |
| `reporterId` | ObjectId -> `users._id` | Yes | Student submitting report |
| `reportedUserId` | ObjectId -> `users._id` | Yes | Reported student account |
| `reason` | String | Yes | Category or violation summary |
| `details` | String | No | Detailed description |
| `status` | Enum (`Open`, `Resolved`, `Dismissed`) | Yes | Moderation status |
| `createdAt` | Date (ISO String) | Yes | Report timestamp |

---

## Entity Relationships

- **One-to-Many**: `users` -> `skills` (`userId`)
- **One-to-Many**: `users` -> `requests` (`senderId`, `receiverId`)
- **One-to-One / Many**: `requests` -> `sessions` (`requestId`)
- **One-to-Many**: `sessions` -> `reviews` (`sessionId`)
- **One-to-Many**: `users` -> `reviews` (`reviewerId`, `reviewedUserId`)
- **One-to-Many**: `users` -> `reports` (`reporterId`, `reportedUserId`)
