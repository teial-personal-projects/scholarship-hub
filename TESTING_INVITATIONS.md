# Email Invitations Testing Guide

This document provides step-by-step instructions for testing the collaboration invitation system.

## Prerequisites

1. **Resend Account**: Ensure you have an active Resend account with API key configured
2. **Email Access**: Access to the email accounts used for testing
3. **Environment Variables**: Verify `.env` has correct Resend configuration
4. **Database**: Run all migrations including `007_collaborations_invitation.sql`

## Test Scenarios

### 1. Test Sending Initial Invitation

**Objective**: Verify that collaboration invitations can be sent successfully.

**Steps**:
1. Create an application in the app
2. Create a collaborator with a valid email address
3. Create a collaboration linking the collaborator to the application
4. Navigate to the application detail page
5. Click the actions menu (⋮) on the collaboration
6. Click "Send Invite"
7. In the dialog, review the details and click "Send Now"

**Expected Results**:
- Success toast: "Invitation Sent - Invitation sent to [collaborator name]"
- Collaboration status changes to "invited"
- Email arrives at collaborator's inbox within 1-2 minutes
- Email contains:
  - Personalized greeting with collaborator name
  - Student name who sent the invite
  - Application/scholarship name
  - Collaboration type (Recommendation/Essay Review/Guidance)
  - Due date (if set)
  - Notes (if provided)
  - Clickable invitation link
  - Expiration notice (7 days)

**Database Verification**:
```sql
-- Check collaboration_invites record was created
SELECT * FROM collaboration_invites
WHERE collaboration_id = [collaboration_id]
ORDER BY created_at DESC LIMIT 1;

-- Should have:
-- - invite_token (64 character hex)
-- - sent_at (timestamp)
-- - expires_at (7 days from sent_at)
-- - delivery_status = 'sent'
-- - resend_email_id (Resend email ID)

-- Check collaboration status
SELECT status, awaiting_action_from, awaiting_action_type
FROM collaborations
WHERE id = [collaboration_id];

-- Should be:
-- - status = 'invited'
-- - awaiting_action_from = 'collaborator'
-- - awaiting_action_type = 'accept_invitation'
```

---

### 2. Test Webhook Delivery Tracking

**Objective**: Verify that Resend webhooks update invitation delivery status.

**Steps**:
1. Send an invitation (follow Test 1)
2. Wait 1-2 minutes for email delivery
3. Check the Resend dashboard for webhook events
4. Verify webhook endpoint is configured: `https://your-domain.com/api/webhooks/resend`

**Expected Results**:
- Webhook events received in order:
  - `email.sent` → delivery_status updates to 'sent'
  - `email.delivered` → delivery_status updates to 'delivered'
  - (Optional) `email.opened` → opened_at timestamp set
  - (Optional) `email.clicked` → clicked_at timestamp set

**Database Verification**:
```sql
SELECT delivery_status, opened_at, clicked_at
FROM collaboration_invites
WHERE collaboration_id = [collaboration_id];

-- After webhook processing:
-- - delivery_status should be 'delivered' (if successful)
-- - opened_at should be set if recipient opened email
-- - clicked_at should be set if recipient clicked link
```

**Manual Webhook Testing** (if needed):
1. Go to Resend Dashboard → Webhooks
2. Find your webhook endpoint
3. Click "Send Test Event"
4. Select event type (e.g., `email.delivered`)
5. Verify your endpoint returns 200 OK

---

### 3. Test Resend Functionality

**Objective**: Verify that invitations can be resent after 3 days or on delivery failure.

**Test 3a: Resend After 3 Days**

**Setup**:
```sql
-- Manually set sent_at to 4 days ago for testing
UPDATE collaboration_invites
SET sent_at = NOW() - INTERVAL '4 days'
WHERE collaboration_id = [collaboration_id];
```

**Steps**:
1. Navigate to application detail page
2. Verify "Resend Invite" appears in the collaboration actions menu
3. Click "Resend Invite"
4. In the dialog, verify title says "Resend Collaboration Invitation"
5. Click "Resend Now"

**Expected Results**:
- Success toast: "Invitation Resent - Invitation resent to [collaborator name]"
- New email sent with new invitation token
- Database record updated with new token and sent_at

**Database Verification**:
```sql
SELECT invite_token, sent_at, expires_at, delivery_status
FROM collaboration_invites
WHERE collaboration_id = [collaboration_id];

-- Should have:
-- - New invite_token (different from original)
-- - sent_at updated to current time
-- - expires_at updated to 7 days from new sent_at
-- - delivery_status reset to 'sent'
```

**Test 3b: Resend on Bounced Email**

**Setup**:
```sql
-- Manually set delivery status to bounced
UPDATE collaboration_invites
SET delivery_status = 'bounced'
WHERE collaboration_id = [collaboration_id];
```

**Steps**:
1. Navigate to application detail page
2. Verify "Resend Invite" appears immediately (even if < 3 days)
3. Follow resend steps from Test 3a

**Expected Results**: Same as Test 3a

---

### 4. Test Expired Token

**Objective**: Verify that expired invitation tokens are rejected.

**Setup**:
```sql
-- Set expires_at to past date
UPDATE collaboration_invites
SET expires_at = NOW() - INTERVAL '1 day'
WHERE collaboration_id = [collaboration_id];
```

**Steps**:
1. Copy the invitation link from the email
2. Attempt to access the invitation link in browser
3. Try to resend the invitation from the UI

**Expected Results**:
- Accessing expired link shows error: "This invitation has expired"
- Attempting to resend shows error: "Invitation has expired. Please send a new invitation."
- Must send a new invitation (not resend)

---

### 5. Test Schedule for Later

**Objective**: Verify that invitations can be scheduled for future delivery.

**Steps**:
1. Navigate to application detail page
2. Click "Send Invite" on a collaboration
3. Click "Schedule for Later"
4. Select a date/time 1 hour in the future
5. Click "Schedule"

**Expected Results**:
- Success toast: "Invitation Scheduled - Invitation scheduled for [date/time]"
- Database record created with pending status
- Email will not be sent until scheduled time

**Database Verification**:
```sql
SELECT delivery_status, sent_at, expires_at
FROM collaboration_invites
WHERE collaboration_id = [collaboration_id];

-- Should have:
-- - delivery_status = 'pending'
-- - sent_at = NULL (not sent yet)
-- - expires_at = scheduled time + 7 days
```

**Note**: Scheduled sending requires a background job/cron to process pending invites. This is not yet implemented.

---

### 6. Test Multiple Collaborations

**Objective**: Verify system handles multiple invitations correctly.

**Steps**:
1. Create 3 different collaborators
2. Create 3 collaborations for the same application
3. Send invitations to all 3
4. Verify each receives their own unique email
5. Resend one invitation
6. Verify only that collaborator receives resend

**Expected Results**:
- Each invitation has unique token
- Correct collaborator name in each email
- Resend only affects intended collaboration

---

### 7. Test Accepting Invitation

**Objective**: Verify that collaborators can accept invitations.

**Note**: This test depends on TODO 6.7 (Collaborator Portal) which is not yet implemented.

**Future Steps** (when TODO 6.7 is complete):
1. Collaborator opens invitation email
2. Clicks invitation link
3. Creates account or logs in
4. Reviews collaboration details
5. Accepts invitation
6. Status updates to 'accepted'

---

## Common Issues and Troubleshooting

### Email Not Received

**Possible Causes**:
1. Invalid Resend API key → Check `.env` file
2. Email in spam folder → Check spam/junk
3. Invalid recipient email → Verify email address
4. Resend account suspended → Check Resend dashboard

**Debug Steps**:
```bash
# Check API logs
tail -f api/logs/app.log | grep "Resend"

# Check database
SELECT * FROM collaboration_invites
WHERE collaboration_id = [id]
ORDER BY created_at DESC;
```

### Webhook Not Updating Status

**Possible Causes**:
1. Webhook not configured in Resend dashboard
2. Incorrect webhook URL
3. Webhook signature verification failing
4. Database connection issues

**Debug Steps**:
```bash
# Check webhook logs
tail -f api/logs/app.log | grep "webhook"

# Verify webhook endpoint is accessible
curl -X POST https://your-domain.com/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{"type":"email.delivered","data":{"email_id":"test"}}'
```

### Resend Button Not Showing

**Possible Causes**:
1. Collaboration status is not 'invited'
2. No invite record exists
3. Less than 3 days since sent_at
4. Delivery status not bounced/failed

**Debug Steps**:
```sql
-- Check collaboration and invite data
SELECT
  c.status,
  ci.sent_at,
  ci.delivery_status,
  NOW() - ci.sent_at AS time_since_sent
FROM collaborations c
LEFT JOIN collaboration_invites ci ON ci.collaboration_id = c.id
WHERE c.id = [collaboration_id];
```

---

## Testing Checklist

- [ ] Send invitation successfully
- [ ] Receive email with correct content
- [ ] Email link works and redirects properly
- [ ] Webhook updates delivery status to 'delivered'
- [ ] Webhook updates opened_at when email opened
- [ ] Webhook updates clicked_at when link clicked
- [ ] Resend button appears after 3 days
- [ ] Resend button appears for bounced emails
- [ ] Resend functionality works correctly
- [ ] Resend generates new token
- [ ] Expired token shows error message
- [ ] Expired token cannot be resent (must send new)
- [ ] Schedule for later creates pending invite
- [ ] Multiple invitations work independently
- [ ] Collaboration status updates correctly
- [ ] History logs invitation actions

---

## Environment Variables

Ensure these are set in `.env`:

```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx

# Application URLs
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
```

---

## Next Steps

After all tests pass:
1. Mark TODO 6.3.10 as complete
2. Document any issues found
3. Proceed to TODO 6.4 (Frontend Collaborator Management)
4. Implement TODO 6.7 (Collaborator Portal for accepting invitations)
