# Dorm Management System (DMS)

A full-stack Dorm Management System built with Angular, Node.js, MySQL, and Docker.

## 🚀 Tech Stack
- Angular (Frontend)
- Node.js + Express (Backend API)
- MySQL (Database)
- Docker & Docker Compose

## 🐳 Run with Docker

docker-compose up --build

## 🌐 Access
- Frontend: http://localhost  
- API: http://localhost:3000  
- MySQL: localhost:3306  

## 📦 Stop Services

docker-compose down

## 🧑‍💻 Local Development (Optional)

Backend:
npm install
node server.js

Frontend:
npm install
ng serve

## 📁 Project Structure
- frontend/ → Angular app  
- backend/ → Node.js API  
- docker-compose.yml → Multi-container setup  

## 📌 Notes
- Frontend is served via Nginx in Docker  
- Backend connects to MySQL using service name `db`  
- Database is initialized using SQL dump in Docker Compose  
