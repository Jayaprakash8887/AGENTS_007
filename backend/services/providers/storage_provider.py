"""
Storage Provider Abstraction Layer

Supports:
- Google Cloud Storage (GCS)
- Azure Blob Storage
- AWS S3
- Local filesystem (for development)
"""
import os
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from uuid import uuid4
from datetime import timedelta
from functools import lru_cache

logger = logging.getLogger(__name__)


class StorageProvider(ABC):
    """Abstract base class for storage providers"""
    
    @abstractmethod
    def upload_file(
        self,
        file_path: Path,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """Upload a file from local path"""
        pass
    
    @abstractmethod
    def upload_bytes(
        self,
        file_content: bytes,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """Upload file bytes directly"""
        pass
    
    @abstractmethod
    def get_signed_url(
        self,
        blob_name: str,
        expiration_minutes: int = 60
    ) -> Optional[str]:
        """Generate a temporary signed URL for access"""
        pass
    
    @abstractmethod
    def download(
        self,
        blob_name: str,
        destination_path: Path
    ) -> bool:
        """Download a file to local path"""
        pass
    
    @abstractmethod
    def delete(self, blob_name: str) -> bool:
        """Delete a file"""
        pass
    
    @abstractmethod
    def get_metadata(self, blob_name: str) -> Optional[Dict[str, Any]]:
        """Get file metadata"""
        pass
    
    @abstractmethod
    def exists(self, blob_name: str) -> bool:
        """Check if file exists"""
        pass


class GCSStorageProvider(StorageProvider):
    """Google Cloud Storage provider"""
    
    def __init__(self, project_id: str, bucket_name: str, credentials_path: Optional[str] = None):
        self.project_id = project_id
        self.bucket_name = bucket_name
        self.credentials_path = credentials_path
        self._client = None
        self._bucket = None
        self._init_client()
    
    def _init_client(self):
        try:
            from google.cloud import storage
            from google.oauth2 import service_account
            
            creds_path = self.credentials_path
            
            # Resolve relative paths
            if creds_path:
                if not os.path.exists(creds_path):
                    backend_dir = Path(__file__).parent.parent.parent
                    potential_path = backend_dir / creds_path
                    if potential_path.exists():
                        creds_path = str(potential_path)
                    else:
                        project_root = backend_dir.parent
                        potential_path = project_root / creds_path.lstrip('../')
                        if potential_path.exists():
                            creds_path = str(potential_path)
            
            if creds_path and os.path.exists(creds_path):
                credentials = service_account.Credentials.from_service_account_file(creds_path)
                self._client = storage.Client(project=self.project_id, credentials=credentials)
                logger.info(f"GCS client initialized with credentials from {creds_path}")
            else:
                self._client = storage.Client(project=self.project_id)
                logger.info("GCS client initialized with default credentials")
            
            self._bucket = self._client.bucket(self.bucket_name)
            
            if not self._bucket.exists():
                logger.warning(f"Bucket {self.bucket_name} does not exist. Creating...")
                self._bucket.create(location="us-central1")
                logger.info(f"Bucket {self.bucket_name} created successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize GCS client: {e}")
            self._client = None
            self._bucket = None
    
    def _generate_blob_name(self, claim_id: str, original_filename: str) -> str:
        file_extension = Path(original_filename).suffix.lower()
        unique_filename = f"{uuid4()}{file_extension}"
        return f"claims/{claim_id}/documents/{unique_filename}"
    
    def upload_file(
        self,
        file_path: Path,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        if not self._client or not self._bucket:
            logger.error("GCS client not available")
            return None, None
        
        try:
            blob_name = self._generate_blob_name(claim_id, original_filename)
            blob = self._bucket.blob(blob_name)
            
            if content_type:
                blob.content_type = content_type
            
            blob.upload_from_filename(str(file_path))
            
            gcs_path = f"gs://{self.bucket_name}/{blob_name}"
            logger.info(f"File uploaded to GCS: {gcs_path}")
            
            return gcs_path, blob_name
            
        except Exception as e:
            logger.error(f"Failed to upload file to GCS: {e}")
            return None, None
    
    def upload_bytes(
        self,
        file_content: bytes,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        if not self._client or not self._bucket:
            logger.error("GCS client not available")
            return None, None
        
        try:
            blob_name = self._generate_blob_name(claim_id, original_filename)
            blob = self._bucket.blob(blob_name)
            
            if content_type:
                blob.content_type = content_type
            
            blob.upload_from_string(file_content, content_type=content_type)
            
            gcs_path = f"gs://{self.bucket_name}/{blob_name}"
            logger.info(f"File uploaded to GCS: {gcs_path}")
            
            return gcs_path, blob_name
            
        except Exception as e:
            logger.error(f"Failed to upload bytes to GCS: {e}")
            return None, None
    
    def get_signed_url(self, blob_name: str, expiration_minutes: int = 60) -> Optional[str]:
        if not self._client or not self._bucket:
            return None
        
        try:
            blob = self._bucket.blob(blob_name)
            if not blob.exists():
                logger.warning(f"Blob does not exist: {blob_name}")
                return None
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=expiration_minutes),
                method="GET"
            )
            return url
            
        except Exception as e:
            logger.error(f"Failed to generate signed URL: {e}")
            return None
    
    def download(self, blob_name: str, destination_path: Path) -> bool:
        if not self._client or not self._bucket:
            return False
        
        try:
            blob = self._bucket.blob(blob_name)
            blob.download_to_filename(str(destination_path))
            logger.info(f"File downloaded from GCS: {blob_name} -> {destination_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to download file from GCS: {e}")
            return False
    
    def delete(self, blob_name: str) -> bool:
        if not self._client or not self._bucket:
            return False
        
        try:
            blob = self._bucket.blob(blob_name)
            if blob.exists():
                blob.delete()
                logger.info(f"File deleted from GCS: {blob_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file from GCS: {e}")
            return False
    
    def get_metadata(self, blob_name: str) -> Optional[Dict[str, Any]]:
        if not self._client or not self._bucket:
            return None
        
        try:
            blob = self._bucket.blob(blob_name)
            if not blob.exists():
                return None
            
            blob.reload()
            return {
                "name": blob.name,
                "size": blob.size,
                "content_type": blob.content_type,
                "created": blob.time_created,
                "updated": blob.updated,
                "md5_hash": blob.md5_hash,
            }
            
        except Exception as e:
            logger.error(f"Failed to get blob metadata: {e}")
            return None
    
    def exists(self, blob_name: str) -> bool:
        if not self._client or not self._bucket:
            return False
        try:
            return self._bucket.blob(blob_name).exists()
        except:
            return False


class AzureBlobStorageProvider(StorageProvider):
    """Azure Blob Storage provider"""
    
    def __init__(
        self,
        connection_string: Optional[str] = None,
        account_name: Optional[str] = None,
        account_key: Optional[str] = None,
        container_name: str = "documents"
    ):
        self.container_name = container_name
        self._client = None
        self._container_client = None
        self._init_client(connection_string, account_name, account_key)
    
    def _init_client(
        self,
        connection_string: Optional[str],
        account_name: Optional[str],
        account_key: Optional[str]
    ):
        try:
            from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
            from datetime import datetime, timedelta
            
            if connection_string:
                self._client = BlobServiceClient.from_connection_string(connection_string)
            elif account_name and account_key:
                self._client = BlobServiceClient(
                    account_url=f"https://{account_name}.blob.core.windows.net",
                    credential=account_key
                )
            else:
                # Try default Azure credentials (managed identity)
                from azure.identity import DefaultAzureCredential
                credential = DefaultAzureCredential()
                self._client = BlobServiceClient(
                    account_url=f"https://{account_name}.blob.core.windows.net",
                    credential=credential
                )
            
            self._container_client = self._client.get_container_client(self.container_name)
            
            # Create container if not exists
            try:
                self._container_client.create_container()
                logger.info(f"Azure Blob container '{self.container_name}' created")
            except Exception:
                pass  # Container already exists
            
            logger.info("Azure Blob Storage client initialized")
            
        except ImportError:
            logger.error("azure-storage-blob package not installed. Run: pip install azure-storage-blob azure-identity")
            self._client = None
        except Exception as e:
            logger.error(f"Failed to initialize Azure Blob client: {e}")
            self._client = None
    
    def _generate_blob_name(self, claim_id: str, original_filename: str) -> str:
        file_extension = Path(original_filename).suffix.lower()
        unique_filename = f"{uuid4()}{file_extension}"
        return f"claims/{claim_id}/documents/{unique_filename}"
    
    def upload_file(
        self,
        file_path: Path,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        if not self._container_client:
            logger.error("Azure Blob client not available")
            return None, None
        
        try:
            blob_name = self._generate_blob_name(claim_id, original_filename)
            blob_client = self._container_client.get_blob_client(blob_name)
            
            with open(file_path, "rb") as data:
                blob_client.upload_blob(data, content_type=content_type, overwrite=True)
            
            azure_path = f"azure://{self.container_name}/{blob_name}"
            logger.info(f"File uploaded to Azure Blob: {azure_path}")
            
            return azure_path, blob_name
            
        except Exception as e:
            logger.error(f"Failed to upload file to Azure Blob: {e}")
            return None, None
    
    def upload_bytes(
        self,
        file_content: bytes,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        if not self._container_client:
            logger.error("Azure Blob client not available")
            return None, None
        
        try:
            blob_name = self._generate_blob_name(claim_id, original_filename)
            blob_client = self._container_client.get_blob_client(blob_name)
            
            blob_client.upload_blob(file_content, content_type=content_type, overwrite=True)
            
            azure_path = f"azure://{self.container_name}/{blob_name}"
            logger.info(f"File uploaded to Azure Blob: {azure_path}")
            
            return azure_path, blob_name
            
        except Exception as e:
            logger.error(f"Failed to upload bytes to Azure Blob: {e}")
            return None, None
    
    def get_signed_url(self, blob_name: str, expiration_minutes: int = 60) -> Optional[str]:
        if not self._client or not self._container_client:
            return None
        
        try:
            from azure.storage.blob import generate_blob_sas, BlobSasPermissions
            from datetime import datetime, timedelta
            
            blob_client = self._container_client.get_blob_client(blob_name)
            
            # Generate SAS token
            sas_token = generate_blob_sas(
                account_name=self._client.account_name,
                container_name=self.container_name,
                blob_name=blob_name,
                account_key=self._client.credential.account_key if hasattr(self._client.credential, 'account_key') else None,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(minutes=expiration_minutes)
            )
            
            return f"{blob_client.url}?{sas_token}"
            
        except Exception as e:
            logger.error(f"Failed to generate Azure SAS URL: {e}")
            return None
    
    def download(self, blob_name: str, destination_path: Path) -> bool:
        if not self._container_client:
            return False
        
        try:
            blob_client = self._container_client.get_blob_client(blob_name)
            
            with open(destination_path, "wb") as file:
                data = blob_client.download_blob()
                file.write(data.readall())
            
            logger.info(f"File downloaded from Azure Blob: {blob_name} -> {destination_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to download file from Azure Blob: {e}")
            return False
    
    def delete(self, blob_name: str) -> bool:
        if not self._container_client:
            return False
        
        try:
            blob_client = self._container_client.get_blob_client(blob_name)
            blob_client.delete_blob()
            logger.info(f"File deleted from Azure Blob: {blob_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file from Azure Blob: {e}")
            return False
    
    def get_metadata(self, blob_name: str) -> Optional[Dict[str, Any]]:
        if not self._container_client:
            return None
        
        try:
            blob_client = self._container_client.get_blob_client(blob_name)
            properties = blob_client.get_blob_properties()
            
            return {
                "name": blob_name,
                "size": properties.size,
                "content_type": properties.content_settings.content_type,
                "created": properties.creation_time,
                "updated": properties.last_modified,
                "md5_hash": properties.content_settings.content_md5,
            }
            
        except Exception as e:
            logger.error(f"Failed to get Azure Blob metadata: {e}")
            return None
    
    def exists(self, blob_name: str) -> bool:
        if not self._container_client:
            return False
        try:
            blob_client = self._container_client.get_blob_client(blob_name)
            return blob_client.exists()
        except:
            return False


class AWSS3StorageProvider(StorageProvider):
    """AWS S3 Storage provider"""
    
    def __init__(
        self,
        bucket_name: str,
        region: str = "us-east-1",
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None
    ):
        self.bucket_name = bucket_name
        self.region = region
        self._client = None
        self._init_client(access_key_id, secret_access_key)
    
    def _init_client(
        self,
        access_key_id: Optional[str],
        secret_access_key: Optional[str]
    ):
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            if access_key_id and secret_access_key:
                self._client = boto3.client(
                    's3',
                    region_name=self.region,
                    aws_access_key_id=access_key_id,
                    aws_secret_access_key=secret_access_key
                )
            else:
                # Use default credentials (IAM role, environment, etc.)
                self._client = boto3.client('s3', region_name=self.region)
            
            # Create bucket if not exists
            try:
                self._client.head_bucket(Bucket=self.bucket_name)
            except ClientError:
                self._client.create_bucket(
                    Bucket=self.bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': self.region}
                )
                logger.info(f"S3 bucket '{self.bucket_name}' created")
            
            logger.info("AWS S3 client initialized")
            
        except ImportError:
            logger.error("boto3 package not installed. Run: pip install boto3")
            self._client = None
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self._client = None
    
    def _generate_key(self, claim_id: str, original_filename: str) -> str:
        file_extension = Path(original_filename).suffix.lower()
        unique_filename = f"{uuid4()}{file_extension}"
        return f"claims/{claim_id}/documents/{unique_filename}"
    
    def upload_file(
        self,
        file_path: Path,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        if not self._client:
            logger.error("S3 client not available")
            return None, None
        
        try:
            key = self._generate_key(claim_id, original_filename)
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self._client.upload_file(str(file_path), self.bucket_name, key, ExtraArgs=extra_args)
            
            s3_path = f"s3://{self.bucket_name}/{key}"
            logger.info(f"File uploaded to S3: {s3_path}")
            
            return s3_path, key
            
        except Exception as e:
            logger.error(f"Failed to upload file to S3: {e}")
            return None, None
    
    def upload_bytes(
        self,
        file_content: bytes,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        if not self._client:
            logger.error("S3 client not available")
            return None, None
        
        try:
            key = self._generate_key(claim_id, original_filename)
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self._client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_content,
                **extra_args
            )
            
            s3_path = f"s3://{self.bucket_name}/{key}"
            logger.info(f"File uploaded to S3: {s3_path}")
            
            return s3_path, key
            
        except Exception as e:
            logger.error(f"Failed to upload bytes to S3: {e}")
            return None, None
    
    def get_signed_url(self, blob_name: str, expiration_minutes: int = 60) -> Optional[str]:
        if not self._client:
            return None
        
        try:
            url = self._client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': blob_name},
                ExpiresIn=expiration_minutes * 60
            )
            return url
            
        except Exception as e:
            logger.error(f"Failed to generate S3 presigned URL: {e}")
            return None
    
    def download(self, blob_name: str, destination_path: Path) -> bool:
        if not self._client:
            return False
        
        try:
            self._client.download_file(self.bucket_name, blob_name, str(destination_path))
            logger.info(f"File downloaded from S3: {blob_name} -> {destination_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to download file from S3: {e}")
            return False
    
    def delete(self, blob_name: str) -> bool:
        if not self._client:
            return False
        
        try:
            self._client.delete_object(Bucket=self.bucket_name, Key=blob_name)
            logger.info(f"File deleted from S3: {blob_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file from S3: {e}")
            return False
    
    def get_metadata(self, blob_name: str) -> Optional[Dict[str, Any]]:
        if not self._client:
            return None
        
        try:
            response = self._client.head_object(Bucket=self.bucket_name, Key=blob_name)
            
            return {
                "name": blob_name,
                "size": response['ContentLength'],
                "content_type": response.get('ContentType'),
                "created": response.get('LastModified'),
                "updated": response.get('LastModified'),
                "md5_hash": response.get('ETag', '').strip('"'),
            }
            
        except Exception as e:
            logger.error(f"Failed to get S3 object metadata: {e}")
            return None
    
    def exists(self, blob_name: str) -> bool:
        if not self._client:
            return False
        try:
            self._client.head_object(Bucket=self.bucket_name, Key=blob_name)
            return True
        except:
            return False


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider (for development)"""
    
    def __init__(self, base_path: str = "./uploads"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Local storage initialized at {self.base_path.absolute()}")
    
    def _generate_path(self, claim_id: str, original_filename: str) -> Tuple[Path, str]:
        file_extension = Path(original_filename).suffix.lower()
        unique_filename = f"{uuid4()}{file_extension}"
        relative_path = f"claims/{claim_id}/documents/{unique_filename}"
        full_path = self.base_path / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        return full_path, relative_path
    
    def upload_file(
        self,
        file_path: Path,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        try:
            import shutil
            dest_path, relative_path = self._generate_path(claim_id, original_filename)
            shutil.copy2(file_path, dest_path)
            
            local_uri = f"file://{dest_path.absolute()}"
            logger.info(f"File uploaded to local storage: {local_uri}")
            
            return local_uri, relative_path
            
        except Exception as e:
            logger.error(f"Failed to upload file to local storage: {e}")
            return None, None
    
    def upload_bytes(
        self,
        file_content: bytes,
        claim_id: str,
        original_filename: str,
        content_type: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        try:
            dest_path, relative_path = self._generate_path(claim_id, original_filename)
            
            with open(dest_path, 'wb') as f:
                f.write(file_content)
            
            local_uri = f"file://{dest_path.absolute()}"
            logger.info(f"File uploaded to local storage: {local_uri}")
            
            return local_uri, relative_path
            
        except Exception as e:
            logger.error(f"Failed to upload bytes to local storage: {e}")
            return None, None
    
    def get_signed_url(self, blob_name: str, expiration_minutes: int = 60) -> Optional[str]:
        # Local storage returns the file path as URL
        file_path = self.base_path / blob_name
        if file_path.exists():
            return f"file://{file_path.absolute()}"
        return None
    
    def download(self, blob_name: str, destination_path: Path) -> bool:
        try:
            import shutil
            source_path = self.base_path / blob_name
            shutil.copy2(source_path, destination_path)
            logger.info(f"File copied: {source_path} -> {destination_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to copy file: {e}")
            return False
    
    def delete(self, blob_name: str) -> bool:
        try:
            file_path = self.base_path / blob_name
            if file_path.exists():
                file_path.unlink()
                logger.info(f"File deleted: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            return False
    
    def get_metadata(self, blob_name: str) -> Optional[Dict[str, Any]]:
        try:
            file_path = self.base_path / blob_name
            if not file_path.exists():
                return None
            
            stat = file_path.stat()
            return {
                "name": blob_name,
                "size": stat.st_size,
                "content_type": None,
                "created": stat.st_ctime,
                "updated": stat.st_mtime,
                "md5_hash": None,
            }
            
        except Exception as e:
            logger.error(f"Failed to get file metadata: {e}")
            return None
    
    def exists(self, blob_name: str) -> bool:
        return (self.base_path / blob_name).exists()


# Provider factory
_storage_provider: Optional[StorageProvider] = None


def get_storage_provider() -> StorageProvider:
    """Get the configured storage provider singleton"""
    global _storage_provider
    
    if _storage_provider is None:
        from config import settings
        
        provider = getattr(settings, 'STORAGE_PROVIDER', 'gcs').lower()
        
        if provider == 'gcs' or provider == 'google':
            _storage_provider = GCSStorageProvider(
                project_id=settings.GCP_PROJECT_ID,
                bucket_name=settings.GCP_BUCKET_NAME,
                credentials_path=settings.GCP_CREDENTIALS_PATH
            )
        elif provider == 'azure':
            _storage_provider = AzureBlobStorageProvider(
                connection_string=getattr(settings, 'AZURE_STORAGE_CONNECTION_STRING', None),
                account_name=getattr(settings, 'AZURE_STORAGE_ACCOUNT_NAME', None),
                account_key=getattr(settings, 'AZURE_STORAGE_ACCOUNT_KEY', None),
                container_name=getattr(settings, 'AZURE_STORAGE_CONTAINER', 'documents')
            )
        elif provider == 'aws' or provider == 's3':
            _storage_provider = AWSS3StorageProvider(
                bucket_name=getattr(settings, 'AWS_S3_BUCKET', 'documents'),
                region=getattr(settings, 'AWS_REGION', 'us-east-1'),
                access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
            )
        elif provider == 'local':
            _storage_provider = LocalStorageProvider(
                base_path=getattr(settings, 'LOCAL_STORAGE_PATH', './uploads')
            )
        else:
            logger.warning(f"Unknown storage provider '{provider}', falling back to local storage")
            _storage_provider = LocalStorageProvider()
    
    return _storage_provider


def reset_storage_provider():
    """Reset the storage provider (useful for testing)"""
    global _storage_provider
    _storage_provider = None
