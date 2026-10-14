# Smart Desk AI — API Testing Report

## 1. Project Information

- **Project Name:** Smart Desk AI
- **Task ID:** SD-001
- **Module:** API Documentation and Testing
- **Testing Tool:** Swagger UI
- **Documentation URL:** `/api/docs/`

## 2. API Test Results

| Test Case | Expected Status | Actual Status |
|---|---|---|
| Get conversation list | 200 OK | 200 OK |
| Get conversation details | 200 OK | 200 OK |
| Send valid AI message | 200 OK | 200 OK |
| Send empty message | 400 Bad Request | 400 Bad Request |
| Missing message field | 400 Bad Request | 400 Bad Request |
| User without permission | 403 Forbidden | 403 Forbidden |

## 3. Conclusion

The tested API endpoints returned the expected HTTP status codes for the recorded test cases.

## 4. Notes

- Tests were performed using Swagger UI.
- Automated test coverage and additional error scenarios remain to be verified.