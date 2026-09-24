# Endpoints

Overview of the routes defined in `src/`; update it when a route changes.

```
POST   /auth/*                        Better Auth
GET    /me                            session user
GET    /crafts
GET    /locations                     cities with districts
GET    /slots?craft=&cityId=&districtId=&date=&start=&end=
                                      future slots with craftsman, craft, rates
GET    /craftsmen/:id                 profile and future slots
GET    /me/profile                    craftsman: own profile, or null before setup
PUT    /me/profile                    craftsman: save profile and rates
GET    /me/availability/day?date=&cityId=
                                      craftsman: quarter-hour states, the day's slots, dates with slots
POST   /me/availability               craftsman: { start, end, areas: [{ cityId, districtId }] }
DELETE /me/availability/:id           craftsman
POST   /bookings                      customer: { slotId, start, end, location, currency }
GET    /me/bookings                   both roles: own jobs with the other party's name
GET    /me/bookings/range?start=&end= craftsman: active jobs in a window (≤ 62 days)
POST   /me/bookings/:id/:transition   confirm | cancel | complete
```

`start`/`end` on `/slots` mean the slot must contain that whole window.
