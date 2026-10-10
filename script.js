// Contact form email and database connection
document.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.querySelector("#contactForm");
    const statusMessage = document.querySelector("#formStatus");

    if (!contactForm) {
        console.log("Contact form not found on this page.");
        return;
    }

    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(contactForm);

        const name = formData.get("name")?.toString().trim();
        const email = formData.get("email")?.toString().trim();
        const subject = formData.get("subject")?.toString().trim();
        const message = formData.get("message")?.toString().trim();

        if (!name || !email || !subject || !message) {
            if (statusMessage) {
                statusMessage.textContent = "Please fill in all fields.";
            } else {
                alert("Please fill in all fields.");
            }
            return;
        }

        const submitButton = contactForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
        }

        if (statusMessage) {
            statusMessage.textContent = "Sending your message...";
        }

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    subject,
                    message
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to send your message."
                );
            }

            if (statusMessage) {
                statusMessage.textContent =
                    "Your message was saved and emailed successfully!";
            } else {
                alert("Your message was saved and emailed successfully!");
            }

            contactForm.reset();

        } catch (error) {
            console.error("Contact form error:", error);

            if (statusMessage) {
                statusMessage.textContent =
                    error.message || "Could not send your message. Please try again.";
            } else {
                alert(error.message || "Could not send your message. Please try again.");
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
});