"""Registry of hooks fired after an enquiry status change has been committed.

Intended use (future per-status actions such as notifying the customer when an enquiry is
confirmed): write a function taking a ``StatusChange`` and register it once at import/start-up::

    def notify_confirmed(change: StatusChange) -> None:
        ...  # e.g. queue an email/WhatsApp message for change.user_id

    register_status_hook(EnquiryStatus.confirmed, notify_confirmed)

Hooks run synchronously after the database commit, only for the NEW status of the change, and
never for a no-op (same status). A hook that raises is logged and swallowed, so it can never
fail the request or undo the committed change. Keep hooks short; hand slow work to a queue.
"""

import logging
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass

from app.models.enquiry import EnquiryStatus

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class StatusChange:
    """One committed status transition. `user_id` is the customer who owns the enquiry."""

    enquiry_id: int
    user_id: int
    old_status: EnquiryStatus
    new_status: EnquiryStatus
    changed_by_user_id: int


StatusHook = Callable[[StatusChange], None]

_hooks: dict[EnquiryStatus, list[StatusHook]] = defaultdict(list)


def register_status_hook(status: EnquiryStatus, hook: StatusHook) -> None:
    """Run `hook` whenever an enquiry is moved to `status`."""
    _hooks[status].append(hook)


def fire_status_hooks(change: StatusChange) -> None:
    """Run every hook registered for the new status; failures are logged, never raised."""
    for hook in list(_hooks.get(change.new_status, [])):
        try:
            hook(change)
        except Exception:
            logger.exception(
                "Status hook %s failed for enquiry %s",
                getattr(hook, "__name__", repr(hook)),
                change.enquiry_id,
            )
