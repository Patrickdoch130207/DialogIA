from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
import auth_routes, client_routes, conversation_routes,training_sample_routes,audio_routes
from ai_models import load_all_models, unload_all_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all_models()
    yield
    unload_all_models()


app = FastAPI(title="DialogIA API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://192.168.1.106:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(client_routes.router)
app.include_router(conversation_routes.router)
app.include_router(training_sample_routes.router)
app.include_router(audio_routes.router)