# HairVision-AI

AI-powered hairstyle recommendation and virtual try-on application.

## Overview

HairVision-AI analyzes a user's face shape and recommends suitable hairstyles based on face shape and gender.

The project is designed to provide personalized hairstyle recommendations and will support virtual hairstyle try-on.

## Features

- Face detection
- Face shape prediction
- Confidence-based prediction
- Gender-aware hairstyle recommendations
- Hairstyle reference images
- Modern web interface
- AI-powered hairstyle try-on (coming soon)

## Face Shapes

The system currently supports:

- Heart
- Oblong
- Oval
- Round
- Square

## Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide Icons

### Backend
- FastAPI
- Python
- OpenCV
- MediaPipe
- XGBoost
- Joblib

## Project Structure

```text
HairVision-AI/
├── ai/
├── backend/
├── data/
├── frontend/
├── models/
├── scripts/
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
