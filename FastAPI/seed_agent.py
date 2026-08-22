import os
import asyncio
import uuid

from dotenv import load_dotenv
from sqlalchemy import select

from database import async_session
import models, security

load_dotenv()

# À adapter avant de lancer le script.
OPERATORS_TO_SEED = [
    {"display_name": "Awa", "pin": "1234"},
    {"display_name": "Junior", "pin": "5678"},
]


async def seed():
    async with async_session() as db:
        # --- Compte agent partagé ---
        username = os.getenv("AGENT_USERNAME")
        password = os.getenv("AGENT_PASSWORD")
        if not username or not password:
            raise RuntimeError("AGENT_USERNAME / AGENT_PASSWORD manquants dans le .env")

        result = await db.execute(
            select(models.User).where(models.User.login_username == username)
        )
        if result.scalar_one_or_none() is None:
            agent = models.User(
                id=uuid.uuid4(),
                login_username=username,
                hashed_password=security.hash_secret(password),
                role=models.UserRole.agent,
            )
            db.add(agent)
            print(f"Compte agent créé : {username}")
        else:
            print(f"Compte agent déjà existant : {username}")

        # --- Opérateurs ---
        for op in OPERATORS_TO_SEED:
            result = await db.execute(
                select(models.Operator).where(models.Operator.display_name == op["display_name"])
            )
            if result.scalar_one_or_none() is None:
                operator = models.Operator(
                    id=uuid.uuid4(),
                    display_name=op["display_name"],
                    pin_hash=security.hash_secret(op["pin"]),
                )
                db.add(operator)
                print(f"Opérateur créé : {op['display_name']}")
            else:
                print(f"Opérateur déjà existant : {op['display_name']}")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())