"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from "@/components/Layout/Navbar";

export default function AddBusinessVenuePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        description: '',
        contactEmail: '',
        contactPhone: '',
        sports: []
    });

    const availableSports = ['Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Pickleball', 'Badminton'];

    const toggleSport = (sport) => {
        if (formData.sports.includes(sport)) {
            setFormData({ ...formData, sports: formData.sports.filter(s => s !== sport) });
        } else {
            setFormData({ ...formData, sports: [...formData.sports, sport] });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Please login first.");
                return;
            }

            // 1. Create community_location entry (placeholder for the map)
            // Note: We need lat/lng. For now, we'll mock or ask. 
            // Ideally we use Geocoding. Let's ask for coordinates or address-to-coord in a real app.
            // For this MVP step, we'll just alert that this part needs the map picker.
            // To keep it simple and consistent with the "Claim" flow, 
            // let's actually redirect them to the /map?mode=add_business flow or similar?
            // OR, let's build a simple form here that saves as "Pending".

            // Let's implement a direct insert into community_locations if we can get coords.
            // Since we don't have a map picker here yet, let's keep it simple:

            alert("To add a new venue, please drop a pin on the map. Redirecting you there...");
            router.push('/map?mode=add'); // We can enhance the map to handle "add business" intent later.

        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="container" style={{ paddingTop: '100px', paddingBottom: '60px', maxWidth: '800px' }}>

                <h1 style={{ marginBottom: '10px' }}>Add New Venue</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>
                    Create a new official venue profile on Project AllStar.
                </p>

                <div className="glass-panel" style={{ padding: '40px' }}>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🗺️</div>
                        <h3>For best accuracy, please use the Map</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '10px auto 30px' }}>
                            To ensure your venue appears correctly for players,
                            please drop a pin on its exact location.
                        </p>
                        <button onClick={handleSubmit} className="btn-primary">
                            Open Map to Add Venue
                        </button>
                    </div>
                </div>

            </div>
        </>
    );
}
