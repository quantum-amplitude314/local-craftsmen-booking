# Endpoints

Overview of the routes defined in `src/`; update it when a route changes.

```
POST   /auth/*                        Better Auth
GET    /me                            session user
GET    /crafts
GET    /locations                     cities with districts
GET    /slots?craft=&cityId=&districtId=&date=&start=&end=
                                      slots with at least an hour of work ahead, with craftsman,
                                      craft, rates
GET    /craftsmen/:id                 profile: name, service, base area, bio, rates
GET    /me/profile                    craftsman: own profile, or null before setup
PUT    /me/profile                    craftsman: save profile and rates
GET    /me/availability/day?date=&cityId=
                                      craftsman: quarter-hour states, the day's slots, dates with slots
POST   /me/availability               craftsman: { start, end, areas: [{ cityId, districtId }] }
DELETE /me/availability/:id           craftsman
POST   /bookings                      customer: { slotId, start, end, location, currency }
GET    /me/bookings/range?start=&end= both roles: open jobs in a window (≤ 62 days), with the
                                      other party's name and actions
POST   /me/bookings/:id/confirm       craftsman: { confirmed: true }
POST   /me/bookings/:id/cancel        both roles: { cancelled: true }
POST   /me/bookings/:id/done          both roles: { completed }, true on the second party's mark
POST   /contact                       public: { name, email, message, captchaToken, webCf? }, mails
                                      the site owner: { sent: true }; signed in, the name, email
                                      and account come from the session
```

`start`/`end` on `/slots` mean the slot must contain that whole window.
