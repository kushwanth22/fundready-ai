"""
Box tool — creates a structured deal room folder and uploads all generated docs.
"""
import io
from boxsdk import Client, OAuth2
from backend.utils.config import settings
from backend.models.state import GeneratedDocs


def get_box_client() -> Client:
    """Authenticate via developer token (swap for OAuth2 in production)."""
    auth = OAuth2(
        client_id=settings.box_client_id,
        client_secret=settings.box_client_secret,
        access_token=settings.box_developer_token,
    )
    return Client(auth)


def create_deal_room(startup_name: str) -> tuple[str, str]:
    """Create a top-level folder for the startup deal room. Returns (folder_id, folder_url)."""
    client = get_box_client()
    folder_name = f"FundReady — {startup_name}"
    folder = client.folder(settings.box_root_folder_id).create_subfolder(folder_name)
    folder_id = folder.id
    folder_url = f"https://app.box.com/folder/{folder_id}"
    return folder_id, folder_url


def upload_doc(folder_id: str, filename: str, content: str) -> dict:
    """Upload a markdown document to the Box deal room folder."""
    client = get_box_client()
    file_stream = io.BytesIO(content.encode("utf-8"))
    uploaded = client.folder(folder_id).upload_stream(file_stream, filename)
    return {
        "file_id": uploaded.id,
        "filename": filename,
        "url": f"https://app.box.com/file/{uploaded.id}",
    }


def upload_all_docs(startup_name: str, docs: GeneratedDocs) -> dict:
    """Create deal room and upload all 6 documents. Returns deal room info."""
    folder_id, folder_url = create_deal_room(startup_name)

    doc_map = {
        "01_market_research.md": docs.market_research,
        "02_competitor_analysis.md": docs.competitor_analysis,
        "03_tam_sam_som.md": docs.tam_sam_som,
        "04_icp_profile.md": docs.icp_profile,
        "05_one_pager.md": docs.one_pager,
        "06_investor_email_templates.md": docs.investor_emails,
    }

    uploaded_files = []
    for filename, content in doc_map.items():
        if content.strip():
            file_info = upload_doc(folder_id, filename, content)
            uploaded_files.append(file_info)

    return {
        "folder_id": folder_id,
        "folder_url": folder_url,
        "files": uploaded_files,
    }
