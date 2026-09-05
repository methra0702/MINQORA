from sqlalchemy import Column, Integer, String, Float

from database import Base


class MiningRecord(Base):
    __tablename__ = "mining_records"

    id = Column(Integer, primary_key=True, index=True)

    date = Column(String, nullable=False, index=True)

    mine_name = Column(String, nullable=False, index=True)

    seam = Column(String, nullable=False, index=True)

    thickness = Column(Float, nullable=False)

    depth = Column(Float, nullable=False)

    production = Column(Float, nullable=False)

    recovery = Column(Float, nullable=False)

    ash_content = Column(Float, nullable=False)

    moisture = Column(Float, nullable=False)

    risk_level = Column(String, nullable=False)

    latitude = Column(Float, nullable=False)

    longitude = Column(Float, nullable=False)

    elevation = Column(Float, nullable=False)