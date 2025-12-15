"""
Script to update the 16 Food purchase claims with:
1. GCS document reference
2. Auto/manual field flags (ocr source)
"""
from database import SyncSessionLocal
from models import Claim, Document
from config import settings
from uuid import uuid4
from datetime import datetime

def main():
    session = SyncSessionLocal()
    
    # GCS base path for documents
    GCS_BUCKET = "agents007-hackathon-jp-2024"
    GCS_BASE_URI = f"gs://{GCS_BUCKET}/claims/1c8ea92e-7580-414a-b89b-35fb3e8aa7da/documents/d813091f-a842-4dd7-9d20-3bd9779e9bf3.jpg"
    
    # Get all Food purchase claims (the 16 auto-generated ones)
    claims = session.query(Claim).filter(Claim.description == 'Food purchase').all()
    print(f"Found {len(claims)} 'Food purchase' claims to update")
    
    for idx, claim in enumerate(claims):
        print(f"\nUpdating claim {idx+1}/{len(claims)}: {claim.claim_number}")
        
        # 1. Update claim_payload with auto source flags
        # Need to create a new dict to trigger SQLAlchemy change detection
        payload = dict(claim.claim_payload) if claim.claim_payload else {}
        payload['amount_source'] = 'ocr'  # Auto extracted from document
        payload['date_source'] = 'ocr'    # Auto extracted from document
        payload['vendor_source'] = 'ocr'  # Auto extracted from document
        payload['description_source'] = 'ocr'  # Auto extracted from document
        payload['category_source'] = 'ocr'  # Auto extracted from document
        
        # Use flag_modified to ensure SQLAlchemy detects the JSONB change
        from sqlalchemy.orm.attributes import flag_modified
        claim.claim_payload = payload
        flag_modified(claim, 'claim_payload')
        
        # 2. Create document entry if not exists
        existing_doc = session.query(Document).filter(Document.claim_id == claim.id).first()
        if not existing_doc:
            doc = Document(
                id=uuid4(),
                tenant_id=settings.DEFAULT_TENANT_ID,
                claim_id=claim.id,
                filename=f"mithaas_receipt_{idx+1}.jpg",
                file_type="IMAGE",
                file_size=150000,  # Approximate size
                storage_path=f"uploads/claims/{claim.id}/mithaas_receipt_{idx+1}.jpg",
                gcs_uri=GCS_BASE_URI,
                gcs_blob_name="claims/1c8ea92e-7580-414a-b89b-35fb3e8aa7da/documents/d813091f-a842-4dd7-9d20-3bd9779e9bf3.jpg",
                storage_type="gcs",
                content_type="image/jpeg",
                document_type="RECEIPT",
                ocr_text="Mithaas Restaurant Receipt",
                ocr_confidence=0.95,
                ocr_processed=True,
                ocr_processed_at=datetime.utcnow(),
                uploaded_at=datetime.utcnow()
            )
            session.add(doc)
            print(f"  Created document with GCS URI: {GCS_BASE_URI}")
        else:
            # Update existing document with GCS reference
            existing_doc.gcs_uri = GCS_BASE_URI
            existing_doc.gcs_blob_name = "claims/1c8ea92e-7580-414a-b89b-35fb3e8aa7da/documents/d813091f-a842-4dd7-9d20-3bd9779e9bf3.jpg"
            existing_doc.storage_type = "gcs"
            existing_doc.ocr_confidence = 0.95
            existing_doc.ocr_processed = True
            print(f"  Updated existing document with GCS URI")
        
        print(f"  Added auto source flags: amount_source=ocr, date_source=ocr, vendor_source=ocr")
    
    session.commit()
    print(f"\n✅ Successfully updated {len(claims)} claims with GCS document references and auto source flags!")
    session.close()

if __name__ == "__main__":
    main()
