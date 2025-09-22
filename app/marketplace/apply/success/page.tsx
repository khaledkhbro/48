import { CheckCircle, ArrowLeft, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ApplicationSuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Application Submitted Successfully!</CardTitle>
            <CardDescription className="text-lg">
              Thank you for applying to become a service provider on our marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">What happens next?</h3>
              </div>
              <ul className="text-left text-blue-700 space-y-2">
                <li>• Our admin team will review your application within 2-3 business days</li>
                <li>• We'll verify your portfolio links and external platform profiles</li>
                <li>• You'll receive an email notification about the status of your application</li>
                <li>• If approved, you'll be able to create and sell services on our marketplace</li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Application Status</h3>
              <p className="text-yellow-700">
                You can check your application status in your dashboard. We may contact you if we need additional
                information.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
              <Button asChild>
                <Link href="/marketplace">Browse Marketplace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
