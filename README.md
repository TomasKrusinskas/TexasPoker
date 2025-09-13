# Texas Hold'em Poker Game
A full-stack web application for playing simplified 6-player Texas Hold'em poker with complete hand tracking and history.

# Overview
This project implements a complete poker game engine with both frontend and backend components. Players can simulate full hands from start to finish, with all actions logged and hands saved to a database for historical viewing.

# Quick Start
# Prerequisites
Docker and Docker Compose

Running the Application
Clone the repository:
git clone https://github.com/TomasKrusinskas/TexasPoker.git
cd TexasPoker
Start the application:
bash
docker compose up -d
Access the game at: http://localhost:3000
The application will be fully ready after the containers start up - no additional setup required.

# How to Play
Game Setup

Click Start to begin a new hand

Players are automatically dealt hole cards

Small blind (20 chips) and big blind (40 chips) are posted automatically

Available Actions

Fold: Discard your hand

Check: Pass the action (when no bet is required)

Call: Match the current bet

Bet: Make the first bet in a round

Raise: Increase an existing bet

All-in: Bet all remaining chips

Use the +/- buttons to adjust bet/raise amounts in big blind increments (40 chips).

# Architecture

Frontend (Next.js + TypeScript)

Framework: Next.js 14 with React

Styling: shadcn/ui component library

State Management: React hooks for game state

Testing: Integration and end-to-end tests included

Backend (Python + FastAPI)

Framework: FastAPI with Python

Database: PostgreSQL

Pattern: Repository pattern for data access

Game Logic: pokerkit library for hand evaluation

Package Management: Poetry
