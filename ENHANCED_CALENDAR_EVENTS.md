# Enhanced Calendar Events Endpoint - Pricing Data Integration

## Overview

The `/api/v1/calendar/events` endpoint has been enhanced to include comprehensive pricing data, solving the frontend's hardcoded fallback rate issue and providing accurate session cost calculations.

## Problem Solved

**Before Enhancement:**
- Frontend used hardcoded fallback rates ($30 student, $15 tutor)
- Students saw $35 but tutors got paid $35 (should be $25)
- Session cancellation calculations were inaccurate
- No access to real admin-configured rates

**After Enhancement:**
- Real admin-configured rates from database
- Accurate student costs and tutor payments
- Proper session cancellation calculations
- Single source of truth for calendar + pricing data

## Enhanced Response Structure

### New Pricing Fields Added

The enhanced response now includes pricing data in the `purchase` object:

```javascript
{
  "id": "event-id",
  "startAt": "2025-01-17T20:30:00Z",
  "endAt": "2025-01-17T21:30:00Z",
  "status": "accepted",
  "title": "Session • rem: 8",
  "sessionsRemaining": 8,
  // ... all existing fields remain unchanged
  
  "purchase": {
    "id": "purchase-id",
    "sessionsPurchased": 10,
    "sessionsConsumed": "2.0000",
    // EXISTING fields remain unchanged
    
    // NEW PRICING FIELDS:
    "hourlyRate": 35,        // Student rate (what students pay)
    "tutorRate": 25,         // Tutor rate (what tutors earn)
    
    "sessionType": {
      "id": "session-type-id",
      "name": "Regular Session",
      "hourlyRate": 35,      // SessionType student rate
      "tutorRate": 25,       // SessionType tutor rate
      "sessionHours": 1,
      "description": "Standard tutoring session"
    },
    
    "bundle": {
      "id": "bundle-id",
      "name": "Math Package",
      "description": "Complete math tutoring package",
      "hourlyRate": 40,      // Bundle weighted average student rate
      "tutorRate": 27.5,     // Bundle weighted average tutor rate
      "items": [
        {
          "id": "item-1",
          "hours": 10,
          "sessionType": {
            "id": "session-type-1",
            "name": "Regular Session",
            "hourlyRate": 35,
            "tutorRate": 25,
            "sessionHours": 1
          }
        },
        {
          "id": "item-2",
          "hours": 10,
          "sessionType": {
            "id": "session-type-2",
            "name": "Advanced Session",
            "hourlyRate": 45,
            "tutorRate": 30,
            "sessionHours": 1
          }
        }
      ]
    }
  }
}
```

## Pricing Data Priority

The system uses this priority order for pricing data:

1. **SessionType Rates** (for single session purchases)
   - `purchase.sessionType.hourlyRate` → Student rate
   - `purchase.sessionType.tutorRate` → Tutor rate (or hourlyRate if null)

2. **Bundle Rates** (for bundle purchases)
   - Weighted average of all bundle items
   - Calculated based on hours and rates of each item

3. **Fallback Handling**
   - Returns `null` for missing pricing data
   - Gracefully handles purchases without session types or bundles

## Implementation Details

### Enhanced Include Tree

The calendar service now includes comprehensive pricing data:

```javascript
const includeTree = [
  { model: User, as: 'student', attributes: ['id', 'email'] },
  { model: User, as: 'tutor', attributes: ['id', 'email'] },
  { model: Subject, as: 'subject', attributes: ['id', 'name'] },
  { 
    model: Purchase, 
    as: 'purchase', 
    attributes: ['id', 'sessionsPurchased', 'sessionsConsumed', 'bundleId', 'sessionTypeId'],
    include: [
      {
        model: SessionType,
        as: 'sessionType',
        attributes: ['id', 'name', 'hourlyRate', 'tutorRate', 'sessionHours', 'description']
      },
      {
        model: Bundle,
        as: 'bundle',
        attributes: ['id', 'name', 'description'],
        include: [
          {
            model: BundleItem,
            as: 'items',
            attributes: ['id', 'hours'],
            include: [
              {
                model: SessionType,
                as: 'sessionType',
                attributes: ['id', 'name', 'hourlyRate', 'tutorRate', 'sessionHours']
              }
            ]
          }
        ]
      }
    ]
  },
];
```

### Pricing Calculation Logic

**SessionType Pricing:**
```javascript
// Direct rates from session type
hourlyRate = sessionType.hourlyRate;
tutorRate = sessionType.tutorRate || sessionType.hourlyRate;
```

**Bundle Pricing (Weighted Average):**
```javascript
// Calculate weighted average across all bundle items
let totalHours = 0;
let totalStudentAmount = 0;
let totalTutorAmount = 0;

bundle.items.forEach(item => {
  const hours = item.hours;
  const studentRate = item.sessionType.hourlyRate;
  const tutorRate = item.sessionType.tutorRate || item.sessionType.hourlyRate;
  
  totalHours += hours;
  totalStudentAmount += hours * studentRate;
  totalTutorAmount += hours * tutorRate;
});

hourlyRate = totalStudentAmount / totalHours;
tutorRate = totalTutorAmount / totalHours;
```

## Backward Compatibility

✅ **Fully Backward Compatible**
- All existing fields remain unchanged
- New pricing fields are additive only
- Existing frontend code continues to work
- No breaking changes to API contract

## Frontend Integration

### Before (Hardcoded Fallbacks)
```javascript
// Frontend was using hardcoded rates
const studentRate = 30; // Hardcoded fallback
const tutorRate = 15;   // Hardcoded fallback
```

### After (Real Database Rates)
```javascript
// Frontend now uses real rates from API
const studentRate = event.purchase.hourlyRate; // Real rate from database
const tutorRate = event.purchase.tutorRate;    // Real rate from database

// Calculate session value accurately
const sessionValue = event.purchase.hourlyRate * sessionDuration;
const tutorEarnings = event.purchase.tutorRate * sessionDuration;
const platformProfit = sessionValue - tutorEarnings;
```

## API Usage

### Request
```bash
GET /api/v1/calendar/events
Authorization: Bearer <token>
```

### Response
```json
{
  "events": [
    {
      "id": "event-1",
      "startAt": "2025-01-17T20:30:00Z",
      "endAt": "2025-01-17T21:30:00Z",
      "status": "accepted",
      "sessionsRemaining": 8,
      "purchase": {
        "id": "purchase-1",
        "sessionsPurchased": 10,
        "sessionsConsumed": "2.0000",
        "hourlyRate": 35,
        "tutorRate": 25,
        "sessionType": {
          "id": "session-type-1",
          "name": "Regular Session",
          "hourlyRate": 35,
          "tutorRate": 25,
          "sessionHours": 1,
          "description": "Standard tutoring session"
        },
        "bundle": null
      }
    }
  ]
}
```

## Benefits

1. **Accurate Pricing**: Real admin-configured rates instead of hardcoded fallbacks
2. **Correct Payments**: Tutors receive accurate payments based on their rates
3. **Proper Calculations**: Session cancellation and value calculations are now accurate
4. **Single Source**: Calendar and pricing data in one API call
5. **Performance**: No additional API calls needed for pricing data
6. **Maintainability**: Centralized pricing logic in backend

## Testing

The pricing calculations have been thoroughly tested with:
- ✅ SessionType pricing (direct rates)
- ✅ Bundle pricing (weighted averages)
- ✅ Missing pricing data (graceful null handling)
- ✅ Null purchase handling (safe fallbacks)

## Migration Guide

**For Frontend Teams:**

1. **Update Rate Access:**
   ```javascript
   // OLD: Hardcoded rates
   const studentRate = 30;
   const tutorRate = 15;
   
   // NEW: Database rates
   const studentRate = event.purchase.hourlyRate;
   const tutorRate = event.purchase.tutorRate;
   ```

2. **Add Null Checks:**
   ```javascript
   // Handle missing pricing data gracefully
   const studentRate = event.purchase?.hourlyRate || 30; // fallback
   const tutorRate = event.purchase?.tutorRate || 15;    // fallback
   ```

3. **Update Calculations:**
   ```javascript
   // Use real rates for all calculations
   const sessionValue = studentRate * sessionDuration;
   const tutorEarnings = tutorRate * sessionDuration;
   const platformProfit = sessionValue - tutorEarnings;
   ```

## Support

For questions or issues with the enhanced calendar events endpoint:
1. Check the response structure matches the documented format
2. Verify pricing data is present in the `purchase` object
3. Ensure proper null handling for missing pricing data
4. Contact backend team for pricing calculation questions
