# My First Projet Backend
# Courses & Users Backend API
A Node.js backend for user management with JWT authentication and profile and picture upload.
Built with Express.MySQL ,and Multer .
## Requirements
Node.js =>18
npm
MySQL database
'.env' file with environment variables
## Setup Instructions
**Clone the repository**
```bash 
git clone
https://github.com/dh0179/Courses.git
```
**Install dependencies**
```bash 
npm install 
```
**Create .env file in the root directory**
```bash
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=1234
DB_NAME=courses
JWT=JWT_SECRET
PORT=3000
```
**Create database**
```bash
create table users(
    id int primary key auto_increment,
    username varchar(50),
    email varchar(100) unique,
    password varchar(250),
    role enum('user','admin') default 'user',
    avatar varchar(250)
);
create table courses(
	id int primary key auto_increment,
    name varchar(10) unique not null,
    price decimal(10,2) not null
);
```
**Running the program**
```bash
npm start
or
npm run dev
```