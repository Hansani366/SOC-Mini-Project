# Global COVID-19 Tracker with Country Insights

## Project Description
This project creates a web-based dashboard that displays real-time COVID-19 statistics for any selected country, along with key country information such as population, currency, capital city, and flag. The system integrates two public APIs, aggregates the data into a single JSON object, displays it on the frontend, and stores it in a MongoDB database through a secure backend.

## Selected Public APIs

COVID-19 Data API (disease.sh) | To retrieve real-time COVID-19 statistics for the selected country.
RestCountries API | To obtain metadata such as population, currency, and country flag.

## Client-Side Plan
- Frontend built using HTML, CSS, and JavaScript.  
- User selects a country from a dropdown list.  
- Web client sends requests to both APIs to gather data.  
- Responses are processed and merged into a single JSON object.  
- Aggregated data is displayed on the dashboard in a clean, user-friendly interface.  
- Aggregated JSON object is sent to the backend via AJAX for storage.  

## Server-Side Plan
- Backend built using Node.js and Express.js.  
- Backend receives the aggregated JSON from the client.  
- OAuth 2.0 authentication will be used for user access, and an API key is required for application-level access.  
- Data is stored in MongoDB for record-keeping.  
- Backend provides an endpoint `/records` to retrieve stored data when needed.  

## Security Plan
- **OAuth 2.0:** Ensures only authenticated users can interact with the system.  
- **API Key:** Ensures only authorized applications can access the backend API.  
- **HTTPS:** Encrypted communication between client and server.  

## Expected Challenges
- Ensuring the two APIs return data in a consistent format to merge properly.  
- Implementing OAuth 2.0 authentication flow correctly.  
- Handling API rate limits and potential downtime.  
- Ensuring smooth integration between frontend, backend, and MongoDB.  
